/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type { ColorMode, Viewport } from '@xyflow/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { Document, isMap, isSeq, parseDocument, stringify as stringifyYaml } from 'yaml';
import type { Node as YamlNode } from 'yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { monaco } from '@kbn/monaco';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { assertNever } from '@kbn/std';
import {
  isTriggerType,
  type LayoutDirection,
  transformWorkflowToGraph,
  WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID,
  type WorkflowYaml,
} from '@kbn/workflows';
import {
  type PendingInsertStepContext,
  type PendingInsertVisual,
  type RenderStepIcon,
  useWorkflowsCapabilities,
  type WorkflowGraphAnchorRect,
  WorkflowGraphCanvasWithoutProvider,
  type WorkflowGraphEditActions,
  type WorkflowGraphInsertionContext,
} from '@kbn/workflows-ui';
import {
  CANVAS_CONFIG_PANEL_MARGIN,
  CanvasConfigPanelShell,
  DEFAULT_CONFIG_PANEL_WIDTH,
  FIELD_EDITOR_EXPANDED_PANEL_WIDTH,
  MIN_CONFIG_PANEL_WIDTH,
  MIN_VISIBLE_CANVAS_PX,
} from './canvas_config_panel_shell';
import type { DataReferenceRunControls } from './data_reference_catalog_tree';
import { LastRunWorkflowIdProvider } from './last_run_hint';
import { StepConfigPanel } from './step_config_panel';
import { TriggerConfigPanel } from './trigger_config_panel';
import { useCanvasUndo } from './use_canvas_undo';
import { useStepFragmentYamlSupport } from './use_step_fragment_yaml_support';
import { createWorkflowContextRegistry } from '../../../../common/lib/create_workflow_context_registry';
import { getAllConnectorsWithDynamic } from '../../../../common/schema';
import {
  selectConnectors,
  selectEditorWorkflowDefinition,
  selectEditorWorkflowGraph,
  selectEditorYaml,
  selectIsExecutionsTab,
  selectIsYamlSyntaxValid,
  selectStepExecutions,
  selectTreeRuns,
  selectWorkflowId,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  applyYamlEdit,
  HIGHLIGHTED_STEP_TRIGGER,
  setHighlightedStepId,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowEditorReadOnly } from '../../../hooks/use_workflow_editor_read_only';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { useWorkflowsExperimentalUiSetting } from '../../../hooks/use_workflows_experimental_ui_setting';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { triggerSchemas } from '../../../trigger_schemas';
import { generateTriggerSnippet } from '../../../widgets/workflow_yaml_editor/lib/snippets/generate_trigger_snippet';
import {
  type ActionOptionData,
  type ActionsMenuInsertionContext,
  ActionsMenuPopover,
} from '../../actions_menu_popover';
import { collectStepsByName } from '../lib/collect_steps';
import { getStepScope } from '../lib/get_step_scope';
import { isStructuralFragmentChange } from '../lib/is_structural_fragment_change';
import { resolveExternalStepFragment } from '../lib/resolve_external_step_fragment';
import { rewriteStepReferences } from '../lib/rewrite_step_references';
import { buildDefaultStep, getStepConfigWarningReason } from '../lib/step_form_schema';
import {
  appendTrigger,
  collectStepNames,
  countTriggers,
  deleteStepByName,
  deleteTrigger,
  getStepFragment,
  getTriggerFragment,
  insertStepAfterName,
  insertStepIntoBranch,
  type MutationResult,
  prependStep,
  replaceStepFragment,
  replaceTriggerFragment,
  setStepFallback,
  uniqueStepName,
} from '../lib/yaml_mutations';

function toColorMode(euiColorMode: string): ColorMode {
  switch (euiColorMode) {
    case 'DARK':
      return 'dark';
    default:
      return 'light';
  }
}

interface WorkflowVisualEditorStatefulProps {
  /** `stayInEditor` keeps the run's result in the editor instead of opening the execution. */
  onStepRun?: (params: { stepId: string; actionType: string; stayInEditor?: boolean }) => void;
  /** Starts a test run of the whole workflow, staying in the editor. */
  onRunWorkflow?: () => void;
  /** False when the step needs upstream data, so running it takes a choice of inputs. */
  canRunStepDirectly?: (stepId: string) => boolean;
  /** Dagre rank direction for the graph layout. Defaults to `'TB'`. */
  direction?: LayoutDirection;
  /**
   * Viewport to restore when the canvas mounts. The parent owns this value
   * so it survives the unmount/remount that happens on YAML↔graph toggle.
   */
  defaultViewport?: Viewport;
  /** Fired when the user pans or zooms; persist to restore on next mount. */
  onViewportChange?: (viewport: Viewport) => void;
  /**
   * Ref to the Monaco editor. When provided, ⌘Z / Ctrl+Z on the canvas
   * delegates to Monaco's undo stack (ADR-0005).
   */
  editorRef?: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

/** Floating read-only flyout inset from the canvas edges (top, right, bottom). */
const PANEL_MARGIN = CANVAS_CONFIG_PANEL_MARGIN;
const CONFIG_PANEL_WIDTH_STORAGE_KEY = 'workflows:configPanelWidth.v3';
const FLASH_MS = 900;
const INSERT_LAYOUT_MS = 300;
/** Slide subsequent nodes, then flash the inserted node border. */
const FLASH_TOTAL_MS = INSERT_LAYOUT_MS + FLASH_MS;

interface InsertionState {
  readonly context: WorkflowGraphInsertionContext;
  readonly anchor: WorkflowGraphAnchorRect;
}

type PanelState =
  | {
      readonly mode: 'edit';
      /**
       * Where this step came from — picks the footer button and its
       * behavior: 'insert' shows "Remove node" (undo the insert); 'edit'
       * shows "Reset node" (restore the pre-flyout fragment). Every edit
       * live-applies to the YAML regardless of origin.
       */
      readonly origin: 'insert' | 'edit';
      /**
       * Identifies this flyout session so the React `key` can stay stable
       * across a rename (which changes `stepName`) and only remount when the
       * user truly switches to editing a different step.
       */
      readonly sessionId: number;
      readonly stepName: string;
      readonly stepType: string;
      readonly actionLabel?: string;
      /** Baseline fragment captured when the flyout opened — the "Reset node" target. */
      readonly fragment: string;
      /** YAML snapshot from immediately before the insert — the "Remove node" target. */
      readonly yamlBeforeOpen: string;
    }
  | {
      readonly mode: 'edit-trigger';
      /** Like a step: 'insert' for a trigger just added (its button removes it), else 'edit'. */
      readonly origin: 'insert' | 'edit';
      readonly sessionId: number;
      readonly triggerIndex: number;
      readonly triggerType: string;
      readonly triggerLabel: string;
      /** Baseline fragment captured when the panel opened — the "Reset trigger" target. */
      readonly fragment: string;
      /** YAML snapshot from immediately before the trigger was added — the "Remove trigger" target. */
      readonly yamlBeforeOpen: string;
    };

/** First item of a snippet sequence (`- type: …`) as a standalone mapping fragment. */
const triggerFragmentFor = (triggerType: string): string => {
  const definition = triggerSchemas.getTriggerDefinition(triggerType);
  const snippet = generateTriggerSnippet(triggerType, {
    full: true,
    monacoSuggestionFormat: false,
    defaultCondition: definition?.snippets?.condition,
  });
  const doc = parseDocument(snippet);
  if (isSeq(doc.contents) && doc.contents.items[0]) {
    const fragment = new Document();
    fragment.contents = doc.contents.items[0] as YamlNode;
    return fragment.toString({ lineWidth: 0 });
  }
  return stringifyYaml({ type: triggerType });
};

/** Maps a graph insertion context to the simplified menu context mode. */
const toMenuInsertionContext = (
  ctx: WorkflowGraphInsertionContext
): ActionsMenuInsertionContext => {
  if (ctx.mode === 'trigger') return { mode: 'trigger' };
  if (ctx.mode === 'fallback') return { mode: 'error' };
  return { mode: 'step' };
};

/** Maps a name-addressed insertion context to a ghost-card positioning context. */
const toPendingContext = (
  context: WorkflowGraphInsertionContext,
  nodeIdForStepName: (stepName: string) => string | undefined
): PendingInsertStepContext | undefined => {
  switch (context.mode) {
    case 'trigger':
      return undefined;
    case 'prepend-step':
      return { mode: 'step' };
    case 'after':
      return { mode: 'step', sourceNodeId: nodeIdForStepName(context.stepName) };
    case 'branch':
      // Ghost card hangs below the fork node.
      return { mode: 'step', sourceNodeId: nodeIdForStepName(context.stepName) };
    case 'fallback':
      return { mode: 'error', stepId: nodeIdForStepName(context.stepName) ?? context.stepName };
  }
};

/**
 * Glue layer between Redux + plugin services and the graph canvas.
 *
 * - Selects the parsed workflow definition (cached when last valid).
 * - Holds the last-valid `WorkflowYaml` ref so the canvas keeps rendering
 *   when the user introduces a YAML syntax error.
 * - Wires `onStepRun` (received from the parent editor) to the flyout's
 *   "Run step" button so the existing context-override flow works as-is.
 * - In edit mode, routes every canvas mutation through the YAML document
 *   (`setYamlString`), which is the single source of truth for both views.
 */
export const WorkflowVisualEditorStateful: React.FC<WorkflowVisualEditorStatefulProps> = ({
  onStepRun,
  onRunWorkflow,
  canRunStepDirectly,
  direction = 'TB',
  defaultViewport,
  onViewportChange,
  editorRef,
}) => {
  const { colorMode } = useEuiTheme();
  const { notifications, workflowsExtensions } = useKibana().services;
  // Persisted preferred width from manual resize only — not the temporary
  // bump used while the advanced field editor is open.
  const [storedPanelWidth = DEFAULT_CONFIG_PANEL_WIDTH, setStoredPanelWidth] = useLocalStorage(
    CONFIG_PANEL_WIDTH_STORAGE_KEY,
    DEFAULT_CONFIG_PANEL_WIDTH
  );
  const [canvasWidth, setCanvasWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : DEFAULT_CONFIG_PANEL_WIDTH * 2
  );
  const [fieldEditorExpanded, setFieldEditorExpanded] = useState(false);
  const maxPanelWidth = Math.max(
    MIN_CONFIG_PANEL_WIDTH,
    canvasWidth - MIN_VISIBLE_CANVAS_PX - PANEL_MARGIN * 2
  );
  const preferredPanelWidth = Math.min(
    Math.max(storedPanelWidth, MIN_CONFIG_PANEL_WIDTH),
    maxPanelWidth
  );
  // Advanced editor needs room for the catalog + value pane; that width is
  // display-only so switching steps / closing the editor restores preferred.
  const panelWidth = fieldEditorExpanded
    ? Math.min(maxPanelWidth, Math.max(preferredPanelWidth, FIELD_EDITOR_EXPANDED_PANEL_WIDTH))
    : preferredPanelWidth;

  const definition = useSelector(selectEditorWorkflowDefinition);
  const stepExecutions = useSelector(selectStepExecutions);
  const treeRuns = useSelector(selectTreeRuns);
  const isExecutionsTab = useSelector(selectIsExecutionsTab);
  const isYamlValid = useSelector(selectIsYamlSyntaxValid) ?? true;
  const editorYaml = useSelector(selectEditorYaml) ?? '';
  // `editorYaml` can return an execution's YAML on the executions tab, which must
  // not be the mutation source. Always mutate from `yamlString` (the live draft).
  const yamlString = useSelector(selectYamlString) ?? '';
  const workflowId = useSelector(selectWorkflowId);
  const loadedConnectors = useSelector(selectConnectors);
  const { canExecuteWorkflow, canUpdateWorkflow } = useWorkflowsCapabilities();
  const { selectedStepId, setSelectedStep, setEditorView } = useWorkflowUrlState();
  const dispatch = useDispatch();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isEditorReadOnly = useWorkflowEditorReadOnly();

  // Authoring belongs to the experimental features: with them off the graph is a read-only view.
  const isVisualEditorEnabled = useWorkflowsExperimentalUiSetting(
    WORKFLOWS_EXPERIMENTAL_FEATURES_SETTING_ID
  );

  // Mirrors the YAML editor's read-only gate (managed workflows, per-workflow edit
  // permission, executions tab) so graph authoring never outpaces what YAML allows.
  const canEdit =
    isVisualEditorEnabled && Boolean(canUpdateWorkflow) && !isExecutionsTab && !isEditorReadOnly;

  // Same contract set that generates the YAML schema, including dynamic connector types.
  const connectors = useMemo(
    () => getAllConnectorsWithDynamic(loadedConnectors?.connectorTypes),
    [loadedConnectors?.connectorTypes]
  );

  const [insertion, setInsertion] = useState<InsertionState | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const stepYamlEditorMount = useStepFragmentYamlSupport(
    panel?.mode === 'edit' ? panel.stepName : undefined
  );
  const [flashNodeId, setFlashNodeId] = useState<string | undefined>(undefined);
  const [pendingInsert, setPendingInsert] = useState<PendingInsertVisual | null>(null);
  /** After a trigger insert's Done: clear the ghost on the next definition update (not eagerly). */
  // Refs so the live-apply callback (passed to StepConfigPanel, which calls
  // it on every draft keystroke) always reads fresh state without the
  // identity churn a useCallback dependency on yamlString/panel would cause.
  const yamlStringRef = useRef(yamlString);
  yamlStringRef.current = yamlString;
  const panelRef = useRef(panel);
  panelRef.current = panel;
  /** Last step fragment this session wrote to the YAML — skips re-dispatching an unchanged draft. */
  const lastAppliedStepFragmentRef = useRef<string | null>(null);
  /** Full YAML immediately after this session's last own write — lets Remove node
   * tell "nothing else touched the YAML since" from "something else did". */
  const lastAppliedYamlRef = useRef<string | null>(null);
  /** Counter backing each step panel's `sessionId` (see PanelState). */
  const nextStepPanelSessionIdRef = useRef(0);
  /** The open step as the YAML last had it after a change from outside the panel, for its session. */
  const [syncedStepFragment, setSyncedStepFragment] = useState<
    { readonly sessionId: number; readonly fragment: string } | undefined
  >();

  // POC pattern: cache the last valid WorkflowYaml so the canvas can stay
  // up while the user fixes a YAML syntax error.
  // Only cache when YAML is valid: partial parses produced during an error
  // state must not overwrite the ref, otherwise the ref poisons the fallback
  // when the fixed YAML passes syntax validation but the client parser still
  // returns undefined for workflowDefinition.
  const lastValidRef = useRef<WorkflowYaml | undefined>(undefined);
  useEffect(() => {
    if (definition && isYamlValid) {
      lastValidRef.current = definition;
    }
  }, [definition, isYamlValid]);

  // Track canvas region width/height so floating panels stay canvas-bounded
  // (including when the push-type execution flyout shrinks this wrapper).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      setCanvasWidth(el.clientWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!panel) setFieldEditorExpanded(false);
  }, [panel]);

  useEffect(() => {
    if (!flashNodeId) return;
    const timer = setTimeout(() => setFlashNodeId(undefined), FLASH_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [flashNodeId]);

  const workflow = definition ?? lastValidRef.current;

  const editorGraph = useSelector(selectEditorWorkflowGraph);
  const contextRegistry = useMemo(
    () => createWorkflowContextRegistry(workflowsExtensions),
    [workflowsExtensions]
  );
  const resolveStepScope = useCallback(
    (stepName: string) =>
      workflow && editorGraph
        ? getStepScope({
            registry: contextRegistry,
            definition: workflow,
            graph: editorGraph,
            stepName,
          })
        : {},
    [contextRegistry, workflow, editorGraph]
  );

  const floatingPanelOpen = panel != null;

  const disabledTriggerIds = useMemo(() => {
    const hasManual = workflow?.triggers?.some((t) => t.type === 'manual');
    return hasManual ? (['manual'] as const) : undefined;
  }, [workflow?.triggers]);

  const transformed = useMemo(
    () =>
      transformWorkflowToGraph(workflow, (triggerType) =>
        triggerSchemas.getTriggerName(triggerType)
      ),
    [workflow]
  );

  const stepsByName = useMemo(() => collectStepsByName(workflow), [workflow]);

  const nodeConfigWarnings = useMemo(() => {
    if (!canEdit) return undefined;
    const warnings = new Map<string, NonNullable<ReturnType<typeof getStepConfigWarningReason>>>();
    Object.entries(transformed.nodeRefs).forEach(([nodeId, ref]) => {
      if (ref.kind !== 'step') return;
      const step = stepsByName.get(ref.stepName);
      if (!step) return;
      const reason = getStepConfigWarningReason(step, connectors);
      if (reason) warnings.set(nodeId, reason);
    });
    return warnings;
  }, [canEdit, transformed.nodeRefs, stepsByName, connectors]);

  const stepNameOf = useCallback(
    (nodeId: string): string | undefined => {
      const ref = transformed.nodeRefs[nodeId];
      return ref?.kind === 'step' ? ref.stepName : undefined;
    },
    [transformed.nodeRefs]
  );

  /** Inverse of `stepNameOf` — step name → graph node id. */
  const nodeIdForStepName = useCallback(
    (stepName: string): string | undefined => {
      const entry = Object.entries(transformed.nodeRefs).find(
        ([, ref]) => ref.kind === 'step' && ref.stepName === stepName
      );
      return entry?.[0];
    },
    [transformed.nodeRefs]
  );

  /** Ids of the nodes inside a fallback (error route) lane, from the lane stamp on node data. */
  const fallbackNodeIds = useMemo(
    () =>
      new Set(
        transformed.nodes
          .filter((n) => n.type !== 'trigger' && n.data.fallbackOf !== undefined)
          .map((n) => n.id)
      ),
    [transformed.nodes]
  );

  // Node ids are a slugified form of the step name (spaces/underscores become
  // hyphens — see IdAllocator), not the step name itself, and `transformed`
  // only reflects a just-inserted/renamed step on the render after the one
  // that triggered it. Selecting straight after insert/rename would otherwise
  // race the still-stale node id lookup, so queue the step name here and let
  // this effect resolve the real node id once the graph catches up.
  const pendingSelectStepNameRef = useRef<string | null>(null);
  useEffect(() => {
    const name = pendingSelectStepNameRef.current;
    if (!name) return;
    const nodeId = nodeIdForStepName(name);
    if (!nodeId) return;
    pendingSelectStepNameRef.current = null;
    setSelectedStep(nodeId);
  }, [nodeIdForStepName, setSelectedStep]);

  // A trigger added from the menu is selected the same way, by its place in the list.
  const pendingSelectTriggerIndexRef = useRef<number | null>(null);
  useEffect(() => {
    const index = pendingSelectTriggerIndexRef.current;
    if (index === null) return;
    const nodeId = Object.entries(transformed.nodeRefs).find(
      ([, ref]) => ref.kind === 'trigger' && ref.triggerIndex === index
    )?.[0];
    if (!nodeId) return;
    pendingSelectTriggerIndexRef.current = null;
    setSelectedStep(nodeId);
  }, [transformed.nodeRefs, setSelectedStep]);

  // Same lookup for the insert flash: it needs the real (slugified) node id, which only exists
  // once `transformed` reflects the inserted step.
  const pendingFlashStepNameRef = useRef<string | null>(null);
  useEffect(() => {
    const name = pendingFlashStepNameRef.current;
    if (!name) return;
    const nodeId = nodeIdForStepName(name);
    if (!nodeId) return;
    pendingFlashStepNameRef.current = null;
    setFlashNodeId(nodeId);
  }, [nodeIdForStepName]);

  const applyMutation = useCallback(
    (result: MutationResult, options?: { flush?: boolean }): boolean => {
      if (!result.success) {
        notifications.toasts.addDanger({
          title: i18n.translate('workflows.visualEditor.mutationFailed', {
            defaultMessage: 'Could not update the workflow',
          }),
          text: result.error,
        });
        return false;
      }
      // Visual mutations must update the graph in the same tick as the YAML
      // write — the middleware's typing debounce would otherwise leave the
      // canvas empty for ~250ms after Done (draft cleared, structure not yet).
      // `applyYamlEdit` computes synchronously (ADR-0002). Edits that cannot change
      // the graph pass `flush: false` and ride the typing debounce via `setYamlString`.
      if (options?.flush ?? true) {
        dispatch(applyYamlEdit(result.yaml));
      } else {
        dispatch(setYamlString(result.yaml));
      }
      return true;
    },
    [dispatch, notifications.toasts]
  );

  /** Inserts a step fragment per the insertion context and flashes the new node. */
  const insertFragment = useCallback(
    (
      context: WorkflowGraphInsertionContext,
      fragment: string,
      newName: string | undefined
    ): MutationResult => {
      let result: MutationResult;
      switch (context.mode) {
        case 'trigger':
          result = appendTrigger(yamlString, fragment);
          break;
        case 'prepend-step':
          result = prependStep(yamlString, fragment);
          break;
        case 'after':
          result = insertStepAfterName(yamlString, fragment, context.stepName);
          break;
        case 'branch':
          result = insertStepIntoBranch(
            yamlString,
            fragment,
            context.stepName,
            context.branch,
            context.position ?? 'end'
          );
          break;
        case 'fallback':
          result = setStepFallback(yamlString, context.stepName, fragment);
          break;
        default:
          return assertNever(context);
      }
      const ok = applyMutation(result);
      if (ok && newName) {
        pendingFlashStepNameRef.current = newName;
      }
      return result;
    },
    [yamlString, applyMutation]
  );

  const defaultFragmentFor = useCallback(
    (action: ActionOptionData): { fragment: string; name?: string } => {
      const stepType = action.id;
      if (isTriggerType(stepType) || triggerSchemas.isRegisteredTriggerId(stepType)) {
        return { fragment: triggerFragmentFor(stepType) };
      }
      const taken = collectStepNames(yamlString);
      const name = uniqueStepName(`${stepType.replaceAll('.', '_')}_step`, taken);
      const step = buildDefaultStep(stepType, name, connectors);
      return { fragment: stringifyYaml(step, { lineWidth: 0 }), name };
    },
    [yamlString, connectors]
  );

  /**
   * Selecting an action for a step position writes the default step straight
   * into the YAML and opens the config panel in edit mode (origin 'insert') —
   * every further edit live-applies the same way. Triggers keep the old
   * draft-then-Done flow (unaffected by this change).
   */
  const handleInsertAction = useCallback(
    (action: ActionOptionData) => {
      if (!insertion) return;
      if (insertion.context.mode === 'trigger') {
        const fragment = triggerFragmentFor(action.id);
        const triggerLabel = triggerSchemas.getTriggerName(action.id);
        const yamlBeforeOpen = yamlString;
        setInsertion(null);
        setPendingInsert(null);
        const result = insertFragment(insertion.context, fragment, undefined);
        if (!result.success) return;
        lastAppliedStepFragmentRef.current = fragment;
        lastAppliedYamlRef.current = result.yaml;
        const triggerIndex = countTriggers(result.yaml) - 1;
        setPanel({
          mode: 'edit-trigger',
          origin: 'insert',
          sessionId: ++nextStepPanelSessionIdRef.current,
          triggerIndex,
          triggerType: action.id,
          triggerLabel,
          fragment,
          yamlBeforeOpen,
        });
        // The new node only exists in the graph after the next render: select it then.
        pendingSelectTriggerIndexRef.current = triggerIndex;
        return;
      }
      const context = insertion.context;
      const yamlBeforeOpen = yamlString;
      const { fragment, name } = defaultFragmentFor(action);
      setInsertion(null);
      setPendingInsert(null);
      if (!name) return;
      const result = insertFragment(context, fragment, name);
      if (!result.success) return;
      lastAppliedStepFragmentRef.current = fragment;
      lastAppliedYamlRef.current = result.yaml;
      setPanel({
        mode: 'edit',
        origin: 'insert',
        sessionId: ++nextStepPanelSessionIdRef.current,
        stepName: name,
        stepType: action.id,
        actionLabel: action.label,
        fragment,
        yamlBeforeOpen,
      });
      // Node ids are a slugified form of the step name — resolve the real id
      // once `transformed` catches up (see pendingSelectStepNameRef above).
      pendingSelectStepNameRef.current = name;
    },
    [insertion, defaultFragmentFor, insertFragment, yamlString]
  );

  /**
   * Live-applies every valid step draft straight to the YAML as the user
   * types (no Done button) — passed as `onFragmentChange` to StepConfigPanel.
   * Skips an unchanged, unparseable, empty-named, or name-colliding draft;
   * that invalid state surfaces via the panel's own close-time check instead.
   */
  const handleStepDraftChange = useCallback(
    (fragment: string) => {
      const current = panelRef.current;
      if (!current || current.mode !== 'edit') return;
      if (fragment === lastAppliedStepFragmentRef.current) return;
      const doc = parseDocument(fragment);
      if (doc.errors.length > 0 || !isMap(doc.contents)) return;
      const nameValue = doc.get('name');
      const newName = typeof nameValue === 'string' ? nameValue.trim() : '';
      if (!newName) return;
      const isRename = newName !== current.stepName;
      if (isRename && collectStepNames(yamlStringRef.current).has(newName)) return;
      // Edits to the step's own settings (`with`, `if`, `timeout`, ...) leave the graph as it is, so
      // they wait for the computation debounce instead of recomputing on every keystroke.
      const isStructural = isStructuralFragmentChange(lastAppliedStepFragmentRef.current, fragment);
      const replaced = replaceStepFragment(yamlStringRef.current, current.stepName, fragment);
      // A renamed step keeps the references to it, in the same write.
      const result =
        isRename && replaced.success
          ? {
              ...replaced,
              yaml: rewriteStepReferences(replaced.yaml, current.stepName, newName),
            }
          : replaced;
      // Node ids follow step names — a rename must recompute in this same tick so nodeRefs
      // carries the new id (the selection effect below would otherwise miss the step for
      // the rest of the 250ms computation debounce window).
      if (!applyMutation(result, { flush: isStructural || isRename })) return;
      lastAppliedStepFragmentRef.current = fragment;
      lastAppliedYamlRef.current = result.yaml;
      if (isRename) {
        setPanel((prev) =>
          prev?.mode === 'edit' && prev.stepName === current.stepName
            ? { ...prev, stepName: newName }
            : prev
        );
        // Node ids are a slugified form of the step name — resolve the real
        // id once `transformed` catches up (see pendingSelectStepNameRef).
        pendingSelectStepNameRef.current = newName;
      }
    },
    [applyMutation]
  );

  // The YAML changed under the open step (an undo, an edit in the YAML tab): hand the panel the
  // step as it now is, so its next edit builds on that instead of writing its old draft back.
  useEffect(() => {
    const current = panelRef.current;
    if (current?.mode !== 'edit') return;
    const fragment = resolveExternalStepFragment({
      editorYaml: yamlString,
      stepName: current.stepName,
      lastAppliedYaml: lastAppliedYamlRef.current,
      lastAppliedFragment: lastAppliedStepFragmentRef.current,
    });
    if (fragment === undefined) return;
    // Adopted: the panel will report it back, and that echo must not be written again.
    lastAppliedStepFragmentRef.current = fragment;
    lastAppliedYamlRef.current = yamlString;
    setSyncedStepFragment({ sessionId: current.sessionId, fragment });
  }, [yamlString]);

  /**
   * Footer button: undoes the insert, restoring the pre-flyout graph (origin
   * 'insert'), or resets the step to its pre-flyout fragment (origin 'edit').
   */
  const handleStepRevert = useCallback(() => {
    const current = panelRef.current;
    if (!current || current.mode !== 'edit') return;
    if (current.origin === 'insert') {
      // Safe only when nothing besides our own live-apply writes touched the
      // YAML since the insert — otherwise fall back to a plain delete so we
      // don't clobber unrelated edits (e.g. made from the YAML tab) that
      // landed while the flyout was open.
      const safeToRestoreSnapshot =
        lastAppliedYamlRef.current != null && yamlStringRef.current === lastAppliedYamlRef.current;
      if (safeToRestoreSnapshot) {
        applyMutation({ success: true, yaml: current.yamlBeforeOpen });
      } else {
        applyMutation(deleteStepByName(yamlStringRef.current, current.stepName));
      }
    } else {
      applyMutation(replaceStepFragment(yamlStringRef.current, current.stepName, current.fragment));
    }
    setPanel(null);
    setSelectedStep(null);
  }, [applyMutation, setSelectedStep]);

  /** ✕ / Escape of a step or trigger panel: every edit is already live in the YAML, so this just closes. */
  const handleStepClose = useCallback(() => {
    setPanel(null);
    setSelectedStep(null);
  }, [setSelectedStep]);

  /** Live-applies every valid trigger draft to the YAML, like `handleStepDraftChange` does for a step. */
  const handleTriggerDraftChange = useCallback(
    (fragment: string) => {
      const current = panelRef.current;
      if (!current || current.mode !== 'edit-trigger') return;
      if (fragment === lastAppliedStepFragmentRef.current) return;
      const doc = parseDocument(fragment);
      if (doc.errors.length > 0 || !isMap(doc.contents)) return;
      const result = replaceTriggerFragment(yamlStringRef.current, current.triggerIndex, fragment);
      // A trigger edit leaves the nodes of the graph as they are, so it waits for the typing debounce.
      if (!applyMutation(result, { flush: false })) return;
      lastAppliedStepFragmentRef.current = fragment;
      lastAppliedYamlRef.current = result.yaml;
    },
    [applyMutation]
  );

  /**
   * Footer button: takes a trigger that was just added out again, restoring the YAML as it was
   * (origin 'insert'), or puts the trigger back as it was when the panel opened (origin 'edit').
   * The panel closes when the YAML changes from elsewhere, so the YAML is ours here.
   */
  const handleTriggerRevert = useCallback(() => {
    const current = panelRef.current;
    if (!current || current.mode !== 'edit-trigger') return;
    if (current.origin === 'insert') {
      applyMutation({ success: true, yaml: current.yamlBeforeOpen });
    } else {
      applyMutation(
        replaceTriggerFragment(yamlStringRef.current, current.triggerIndex, current.fragment)
      );
    }
    setPanel(null);
    setSelectedStep(null);
  }, [applyMutation, setSelectedStep]);

  // The YAML changed from elsewhere (an undo, an edit in the YAML tab). A trigger is found by its
  // place in the list, which may have moved, so its panel closes; all it applied is in the YAML.
  useEffect(() => {
    const current = panelRef.current;
    if (current?.mode !== 'edit-trigger' || yamlString === lastAppliedYamlRef.current) return;
    setPanel(null);
    setSelectedStep(null);
  }, [yamlString, setSelectedStep]);

  /** Steps live-apply, so switching the canvas/URL selection never loses anything. */
  const requestStepSelect = useCallback(
    (id: string | undefined) => {
      setSelectedStep(id ?? null);
    },
    [setSelectedStep]
  );

  const panelIsFallbackStep = useMemo(() => {
    if (panel?.mode !== 'edit') return false;
    const nodeId = nodeIdForStepName(panel.stepName);
    return nodeId !== undefined && fallbackNodeIds.has(nodeId);
  }, [panel, nodeIdForStepName, fallbackNodeIds]);

  const openEditPanel = useCallback(
    (stepName: string) => {
      const step = stepsByName.get(stepName);
      const fragment =
        getStepFragment(editorYaml, stepName) ??
        (step ? stringifyYaml(step, { lineWidth: 0 }) : undefined);
      if (!fragment) return;
      const stepType =
        typeof step?.type === 'string'
          ? step.type
          : String(parseDocument(fragment).get('type') ?? '');
      if (!stepType) return;
      const current = panelRef.current;
      // Skip no-op re-opens (also covers the step we just opened via insert — same stepName,
      // same panel, so origin/fragment/yamlBeforeOpen must not be reset).
      if (current?.mode === 'edit' && current.stepName === stepName) return;
      setInsertion(null);
      setPendingInsert(null);
      // Baseline the live-apply dedup to the fragment we're opening with, so
      // the panel's first onFragmentChange (its own mount value) is a no-op.
      lastAppliedStepFragmentRef.current = fragment;
      lastAppliedYamlRef.current = yamlStringRef.current;
      setPanel({
        mode: 'edit',
        origin: 'edit',
        sessionId: ++nextStepPanelSessionIdRef.current,
        stepName,
        stepType,
        fragment,
        yamlBeforeOpen: editorYaml,
      });
    },
    [stepsByName, editorYaml]
  );

  const openTriggerEditPanel = useCallback(
    (triggerIndex: number) => {
      // The trigger that is already open (e.g. the one just added) keeps its session.
      const current = panelRef.current;
      if (current?.mode === 'edit-trigger' && current.triggerIndex === triggerIndex) return;
      const trigger = workflow?.triggers?.[triggerIndex];
      const fragment =
        getTriggerFragment(editorYaml, triggerIndex) ??
        (trigger ? stringifyYaml(trigger, { lineWidth: 0 }) : undefined);
      if (!fragment || !trigger) return;
      const triggerType = trigger.type;
      const triggerLabel = triggerSchemas.getTriggerName(triggerType);
      setInsertion(null);
      setPendingInsert(null);
      // Baseline the live-apply dedup, as for a step.
      lastAppliedStepFragmentRef.current = fragment;
      lastAppliedYamlRef.current = yamlStringRef.current;
      setPanel({
        mode: 'edit-trigger',
        origin: 'edit',
        sessionId: ++nextStepPanelSessionIdRef.current,
        triggerIndex,
        triggerType,
        triggerLabel,
        fragment,
        yamlBeforeOpen: editorYaml,
      });
    },
    [workflow, editorYaml]
  );

  // Single source of truth: canvas/URL selection drives the edit config panel.
  // Only re-run when the selected node changes — not when openEditPanel's
  // identity churns with editorYaml (that was resetting the panel mid-edit).
  const openEditPanelRef = useRef(openEditPanel);
  openEditPanelRef.current = openEditPanel;
  const openTriggerEditPanelRef = useRef(openTriggerEditPanel);
  openTriggerEditPanelRef.current = openTriggerEditPanel;
  const stepNameOfRef = useRef(stepNameOf);
  stepNameOfRef.current = stepNameOf;
  const nodeRefsRef = useRef(transformed.nodeRefs);
  nodeRefsRef.current = transformed.nodeRefs;
  useEffect(() => {
    if (!selectedStepId) {
      setPanel((current) =>
        current?.mode === 'edit' || current?.mode === 'edit-trigger' ? null : current
      );
      return;
    }
    const ref = nodeRefsRef.current[selectedStepId];
    if (ref?.kind === 'trigger') {
      openTriggerEditPanelRef.current(ref.triggerIndex);
      return;
    }
    const stepName = stepNameOfRef.current(selectedStepId);
    if (!stepName) {
      setPanel((current) =>
        current?.mode === 'edit' || current?.mode === 'edit-trigger' ? null : current
      );
      return;
    }
    openEditPanelRef.current(stepName);
  }, [selectedStepId]);

  // The canvas hands these actions to every node through a context, so a new object re-renders
  // every node. They must not change on a keystroke (the step form rewrites the YAML on each one):
  // they read the latest state from this ref instead of closing over it.
  const editStateRef = useRef({
    yamlString,
    panel,
    selectedStepId,
    nodeRefs: transformed.nodeRefs,
    fallbackNodeIds,
    nodeIdForStepName,
    requestStepSelect,
    setSelectedStep,
    applyMutation,
  });
  editStateRef.current = {
    yamlString,
    panel,
    selectedStepId,
    nodeRefs: transformed.nodeRefs,
    fallbackNodeIds,
    nodeIdForStepName,
    requestStepSelect,
    setSelectedStep,
    applyMutation,
  };

  const editActions = useMemo<WorkflowGraphEditActions | undefined>(() => {
    if (!canEdit) return undefined;
    return {
      onInsert: (context, anchor) => {
        const { setSelectedStep: clearSelection, nodeIdForStepName: idForName } =
          editStateRef.current;
        setPanel(null);
        clearSelection(null);
        setInsertion({ context, anchor });
        const pendingContext = toPendingContext(context, idForName);
        setPendingInsert(pendingContext ? { phase: 'choosing', context: pendingContext } : null);
      },
      onEditStep: (nodeId) => {
        editStateRef.current.requestStepSelect(nodeId);
      },
      onDeleteNode: (nodeId) => {
        const {
          nodeRefs,
          fallbackNodeIds: fallbackIds,
          yamlString: yamlBeforeDelete,
          selectedStepId: currentSelectedStepId,
          panel: currentPanel,
          setSelectedStep: clearSelection,
          applyMutation: apply,
        } = editStateRef.current;
        const ref = nodeRefs[nodeId];
        if (!ref) return;
        const isFallback = ref.kind === 'step' && fallbackIds.has(nodeId);
        const result =
          ref.kind === 'trigger'
            ? deleteTrigger(yamlBeforeDelete, ref.triggerIndex)
            : deleteStepByName(yamlBeforeDelete, ref.stepName);
        if (!apply(result)) return;
        if (currentSelectedStepId === nodeId) clearSelection(null);
        if (
          currentPanel?.mode === 'edit' &&
          ref.kind === 'step' &&
          currentPanel.stepName === ref.stepName
        ) {
          setPanel(null);
        }
        if (
          currentPanel?.mode === 'edit-trigger' &&
          ref.kind === 'trigger' &&
          currentPanel.triggerIndex === ref.triggerIndex
        ) {
          setPanel(null);
        }
        const title =
          ref.kind === 'trigger'
            ? i18n.translate('workflows.visualEditor.triggerDeleted', {
                defaultMessage: 'Trigger deleted',
              })
            : isFallback
            ? i18n.translate('workflows.visualEditor.errorRouteRemoved', {
                defaultMessage: 'Error route removed',
              })
            : i18n.translate('workflows.visualEditor.stepDeleted', {
                defaultMessage: 'Step "{name}" deleted',
                values: { name: ref.stepName },
              });
        const toast = notifications.toasts.addSuccess(
          {
            title,
            'data-test-subj': 'workflowVisualEditorDeleteSuccessToast',
            actionProps: {
              primary: {
                'data-test-subj': 'workflowVisualEditorUndoDelete',
                children: i18n.translate('workflows.visualEditor.undoDelete', {
                  defaultMessage: 'Undo',
                }),
                onClick: () => {
                  notifications.toasts.remove(toast);
                  // Restoring the pre-delete YAML would silently discard anything edited since
                  // (the toast stays up for 10s), so only restore an untouched document.
                  if (yamlStringRef.current === result.yaml) {
                    apply({ success: true, yaml: yamlBeforeDelete });
                    return;
                  }
                  notifications.toasts.addWarning({
                    title: i18n.translate('workflows.visualEditor.undoDeleteStale', {
                      defaultMessage: 'Could not restore the deleted item',
                    }),
                    text: i18n.translate('workflows.visualEditor.undoDeleteStaleText', {
                      defaultMessage:
                        'The workflow was edited after the deletion. Use undo in the YAML editor instead.',
                    }),
                  });
                },
              },
            },
          },
          // Give the user time to recover a destructive delete (nested paths go with the step).
          { toastLifeTimeMs: 10000 }
        );
      },
    };
  }, [canEdit, notifications.toasts]);

  const renderStepIcon = useCallback<RenderStepIcon>(
    ({ stepType, isTrigger: _isTrigger, color }) => (
      <StepIcon stepType={stepType} executionStatus={undefined} iconColor={color} />
    ),
    []
  );

  const handleRunStep = useCallback(() => {
    if (panel?.mode !== 'edit') return;
    onStepRun?.({ stepId: panel.stepName, actionType: 'run' });
  }, [onStepRun, panel]);

  const handleOpenInYaml = useCallback(() => {
    // Tell the YAML editor which step to reveal — it watches the
    // `highlightedStepId` slice and calls `revealLineInCenter` on the
    // matching line when it changes.
    if (panel?.mode === 'edit') {
      dispatch(setHighlightedStepId({ stepId: panel.stepName }));
    } else if (panel?.mode === 'edit-trigger') {
      dispatch(setHighlightedStepId({ stepId: HIGHLIGHTED_STEP_TRIGGER }));
    }
    setEditorView('yaml');
  }, [dispatch, panel, setEditorView]);

  const handleStepSelect = useCallback(
    (id: string | undefined) => {
      requestStepSelect(id);
    },
    [requestStepSelect]
  );

  const handleStepRun = useCallback(
    (stepName: string) => onStepRun?.({ stepId: stepName, actionType: 'run' }),
    [onStepRun]
  );

  // The parent passes `onStepRun` only when the user may test a step in this workflow (its own
  // permissions, not just the global capability), so no handler means no Run controls.
  const canRunSteps =
    Boolean(canExecuteWorkflow) && Boolean(onStepRun) && isYamlValid && !isExecutionsTab;
  const referenceTreeRunControls = useMemo(
    (): DataReferenceRunControls => ({
      workflowId,
      treeRuns,
      ...(canRunSteps && onStepRun
        ? {
            canRunStepDirectly,
            onRunStep: (stepName: string) =>
              onStepRun({ stepId: stepName, actionType: 'run', stayInEditor: true }),
            onRunWorkflow,
          }
        : {}),
    }),
    [workflowId, treeRuns, canRunSteps, onStepRun, canRunStepDirectly, onRunWorkflow]
  );

  const closeInsertion = useCallback(() => {
    setInsertion(null);
    setPendingInsert((current) => (current?.phase === 'choosing' ? null : current));
  }, []);

  useCanvasUndo(editorRef, yamlStringRef);

  if (!workflow) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.visualEditor.loadingWorkflowGraph"
              defaultMessage="Loading workflow graph…"
            />
          </h2>
        }
      />
    );
  }

  return (
    <div
      ref={wrapperRef}
      css={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}
    >
      <WorkflowGraphCanvasWithoutProvider
        workflow={workflow}
        transformed={transformed}
        stepExecutions={stepExecutions}
        isYamlValid={isYamlValid}
        selectedStepId={selectedStepId}
        selectedNodePanelInset={floatingPanelOpen ? panelWidth + PANEL_MARGIN : undefined}
        onStepSelect={handleStepSelect}
        colorMode={toColorMode(colorMode)}
        direction={direction}
        renderStepIcon={renderStepIcon}
        onStepRun={handleStepRun}
        canRunSteps={canRunSteps}
        defaultViewport={defaultViewport}
        onViewportChange={onViewportChange}
        showZoomControls
        edit={editActions}
        nodeConfigWarnings={nodeConfigWarnings}
        flashNodeId={flashNodeId}
        pendingInsert={pendingInsert ?? undefined}
        suppressInsertionControls={insertion != null}
      />
      {insertion && (
        <ActionsMenuPopover
          isOpen
          closePopover={closeInsertion}
          insertionContext={
            insertion.context.mode === 'trigger'
              ? { mode: 'trigger', disabledTriggerIds }
              : toMenuInsertionContext(insertion.context)
          }
          disabledTriggerIds={disabledTriggerIds}
          onActionSelected={handleInsertAction}
        />
      )}
      {panel && panel.mode === 'edit' && (
        <CanvasConfigPanelShell
          width={panelWidth}
          onWidthChange={setStoredPanelWidth}
          canvasWidth={canvasWidth}
        >
          <KibanaSectionErrorBoundary
            key={panel.sessionId}
            sectionName={i18n.translate(
              'workflows.visualEditor.stepConfigPanelErrorBoundarySectionName',
              { defaultMessage: 'Step configuration panel' }
            )}
          >
            <LastRunWorkflowIdProvider value={workflowId}>
              <StepConfigPanel
                mode={panel.origin}
                stepType={panel.stepType}
                stepName={panel.stepName}
                actionLabel={panel.actionLabel}
                initialFragment={panel.fragment}
                syncedFragment={
                  syncedStepFragment?.sessionId === panel.sessionId ? syncedStepFragment : undefined
                }
                connectors={connectors}
                workflowDefinition={workflow}
                resolveStepScope={resolveStepScope}
                onClose={handleStepClose}
                onRevert={handleStepRevert}
                isFallbackStep={panelIsFallbackStep}
                onExpandedChange={setFieldEditorExpanded}
                onFragmentChange={handleStepDraftChange}
                onYamlEditorMount={stepYamlEditorMount}
                runControls={referenceTreeRunControls}
                readOnly={!canEdit}
                onRunStep={canRunSteps ? handleRunStep : undefined}
                onOpenInYaml={handleOpenInYaml}
              />
            </LastRunWorkflowIdProvider>
          </KibanaSectionErrorBoundary>
        </CanvasConfigPanelShell>
      )}
      {panel && panel.mode === 'edit-trigger' && (
        <CanvasConfigPanelShell
          width={panelWidth}
          onWidthChange={(w) => setStoredPanelWidth(w)}
          canvasWidth={canvasWidth}
          data-test-subj="workflowTriggerConfigPanelContainer"
        >
          <TriggerConfigPanel
            key={panel.sessionId}
            mode={panel.origin}
            triggerType={panel.triggerType}
            triggerLabel={panel.triggerLabel}
            initialFragment={panel.fragment}
            workflowYaml={editorYaml}
            onClose={handleStepClose}
            onRevert={handleTriggerRevert}
            onFragmentChange={handleTriggerDraftChange}
            readOnly={!canEdit}
            onOpenInYaml={handleOpenInYaml}
          />
        </CanvasConfigPanelShell>
      )}
    </div>
  );
};
