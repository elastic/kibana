/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiEmptyPrompt,
  EuiFocusTrap,
  EuiLoadingSpinner,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type { ColorMode, Viewport } from '@xyflow/react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { Document, isMap, isSeq, parseDocument, stringify as stringifyYaml } from 'yaml';
import type { Node as YamlNode } from 'yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { monaco } from '@kbn/monaco';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import {
  isTriggerType,
  type LayoutDirection,
  transformWorkflowToGraph,
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
  WORKFLOWS_SURFACE_RADIUS,
} from '@kbn/workflows-ui';
import {
  CANVAS_CONFIG_PANEL_MARGIN,
  CanvasConfigPanelShell,
  DEFAULT_CONFIG_PANEL_WIDTH,
  FIELD_EDITOR_EXPANDED_PANEL_WIDTH,
  MIN_CONFIG_PANEL_WIDTH,
  MIN_VISIBLE_CANVAS_PX,
} from './canvas_config_panel_shell';
import { StepConfigPanel } from './step_config_panel';
import { TriggerConfigPanel } from './trigger_config_panel';
import { useCreationAgentChat } from './use_creation_agent_chat';
import {
  getShowCreationEmptyState,
  subscribeShowCreationEmptyState,
} from './workflow_creation_empty_state_prototype';
import { WorkflowCreationPanel } from './workflow_creation_panel';
import {
  WorkflowSettingsBPanel,
  type WorkflowSettingsBPanelKind,
} from './workflow_settings_b_panel';
import { WorkflowSettingsCSurface } from './workflow_settings_c_surface';
import {
  getWorkflowSettingsBNodeLayout,
  getWorkflowSettingsSurfaceVariant,
  subscribeWorkflowSettingsSurfaceVariant,
  type WorkflowSettingsBNodeLayout,
  type WorkflowSettingsSurfaceVariant,
} from './workflow_settings_surface_variant';
import { type FlyoutTarget, WorkflowVisualEditorFlyout } from './workflow_visual_editor_flyout';
import { PLUGIN_ID } from '../../../../common';
import { getAllConnectorsWithDynamic } from '../../../../common/schema';
import { flushWorkflowComputation } from '../../../entities/workflows/store/workflow_detail/middleware';
import {
  selectConnectors,
  selectEditorWorkflowDefinition,
  selectEditorWorkflowLookup,
  selectEditorYaml,
  selectIsExecutionsTab,
  selectIsYamlSyntaxValid,
  selectStepExecutions,
  selectWorkflowId,
  selectWorkflowName,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  HIGHLIGHTED_STEP_TRIGGER,
  setHighlightedStepId,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowEditorReadOnly } from '../../../hooks/use_workflow_editor_read_only';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import {
  parseConstsToFields,
  parseOutputsToFields,
} from '../../../pages/workflow_detail/ui/workflow_settings_fields_model';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { triggerSchemas } from '../../../trigger_schemas';
import { generateTriggerSnippet } from '../../../widgets/workflow_yaml_editor/lib/snippets/generate_trigger_snippet';
import {
  type ActionOptionData,
  type ActionsMenuInsertionContext,
  ActionsMenuPopover,
} from '../../actions_menu_popover';
import { collectStepsByName } from '../lib/collect_steps';
import { buildDefaultStep, getStepConfigWarningReason } from '../lib/step_form_schema';
import {
  appendTrigger,
  collectStepNames,
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
  onStepRun?: (params: { stepId: string; actionType: string }) => void;
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

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};

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
      readonly triggerIndex: number;
      readonly triggerType: string;
      readonly triggerLabel: string;
      readonly fragment: string;
    }
  | {
      readonly mode: 'insert-trigger';
      readonly triggerType: string;
      readonly triggerLabel: string;
      readonly fragment: string;
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
  direction = 'TB',
  defaultViewport,
  onViewportChange,
  editorRef,
}) => {
  const { colorMode, euiTheme } = useEuiTheme();
  const floatingShadow = useEuiShadow('m');
  const { notifications, application } = useKibana().services;
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
  const isExecutionsTab = useSelector(selectIsExecutionsTab);
  const isYamlValid = useSelector(selectIsYamlSyntaxValid) ?? true;
  const editorYaml = useSelector(selectEditorYaml) ?? '';
  // `editorYaml` can return an execution's YAML on the executions tab, which must
  // not be the mutation source. Always mutate from `yamlString` (the live draft).
  const yamlString = useSelector(selectYamlString) ?? '';
  const workflowId = useSelector(selectWorkflowId);
  const workflowName = useSelector(selectWorkflowName);
  const workflowLookup = useSelector(selectEditorWorkflowLookup);
  const loadedConnectors = useSelector(selectConnectors);
  const { canExecuteWorkflow, canUpdateWorkflow } = useWorkflowsCapabilities();
  const { selectedStepId, setSelectedStep, setEditorView } = useWorkflowUrlState();
  const dispatch = useDispatch();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);
  const isEditorReadOnly = useWorkflowEditorReadOnly();

  // Mirrors the YAML editor's read-only gate (managed workflows, per-workflow edit
  // permission, executions tab) so graph authoring never outpaces what YAML allows.
  const canEdit = Boolean(canUpdateWorkflow) && !isExecutionsTab && !isEditorReadOnly;

  const { isAgentBuilderAvailable, openAgentChat } = useCreationAgentChat({
    yaml: editorYaml,
    workflowId,
    workflowName,
  });

  // Same contract set that generates the YAML schema, including dynamic connector types.
  const connectors = useMemo(
    () => getAllConnectorsWithDynamic(loadedConnectors?.connectorTypes),
    [loadedConnectors?.connectorTypes]
  );

  const [insertion, setInsertion] = useState<InsertionState | null>(null);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [flashNodeId, setFlashNodeId] = useState<string | undefined>(undefined);
  const [pendingInsert, setPendingInsert] = useState<PendingInsertVisual | null>(null);
  /** After a trigger insert's Done: clear the ghost on the next definition update (not eagerly). */
  const clearPendingAfterDefinitionRef = useRef(false);
  const [settingsSurfaceVariant, setSettingsSurfaceVariantState] =
    useState<WorkflowSettingsSurfaceVariant>(() => getWorkflowSettingsSurfaceVariant());
  const [settingsBNodeLayout, setSettingsBNodeLayoutState] = useState<WorkflowSettingsBNodeLayout>(
    () => getWorkflowSettingsBNodeLayout()
  );
  const [settingsBKind, setSettingsBKind] = useState<WorkflowSettingsBPanelKind | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [showCreationEmptyState, setShowCreationEmptyStateLocal] = useState(() =>
    getShowCreationEmptyState()
  );
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

  useEffect(
    () =>
      subscribeWorkflowSettingsSurfaceVariant(() => {
        setSettingsSurfaceVariantState(getWorkflowSettingsSurfaceVariant());
        setSettingsBNodeLayoutState(getWorkflowSettingsBNodeLayout());
      }),
    []
  );

  useEffect(
    () =>
      subscribeShowCreationEmptyState(() => {
        setShowCreationEmptyStateLocal(getShowCreationEmptyState());
      }),
    []
  );

  const openSettingsBPanel = useCallback(
    (kind: WorkflowSettingsBPanelKind) => {
      setPanel(null);
      setPendingInsert(null);
      setSelectedStep(null);
      setSettingsBKind(kind);
    },
    [setSelectedStep]
  );

  const closeSettingsBPanel = useCallback(() => {
    setSettingsBKind(null);
  }, []);

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

  // Drop a trigger insert's ghost only after the computed definition has
  // updated, so Done never briefly shows the empty-canvas CTA between clear
  // and commit.
  useLayoutEffect(() => {
    if (!clearPendingAfterDefinitionRef.current) return;
    clearPendingAfterDefinitionRef.current = false;
    setPendingInsert(null);
  }, [definition]);

  // Focus the flyout panel when a step becomes selected so keyboard users
  // land inside the panel rather than remaining on the canvas node.
  useEffect(() => {
    if (selectedStepId) {
      flyoutPanelRef.current?.focus();
    }
  }, [selectedStepId]);

  // Track canvas region width/height so floating panels stay canvas-bounded
  // (including when the push-type execution flyout shrinks this wrapper).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      setCanvasWidth(el.clientWidth);
      setCanvasHeight(el.clientHeight);
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

  const settingsCounts = useMemo(() => {
    try {
      const doc = parseDocument(editorYaml);
      const js = doc.toJS() as Record<string, unknown> | null;
      return {
        constants: parseConstsToFields(js?.consts ?? workflow?.consts).length,
        outputs: parseOutputsToFields(js?.outputs ?? workflow?.outputs).length,
      };
    } catch {
      return {
        constants: parseConstsToFields(workflow?.consts).length,
        outputs: parseOutputsToFields(workflow?.outputs).length,
      };
    }
  }, [editorYaml, workflow?.consts, workflow?.outputs]);

  const floatingPanelOpen = panel != null || settingsBKind != null;

  const settingsNodesProp = useMemo(
    () =>
      canEdit && settingsSurfaceVariant === 'b'
        ? {
            workflowName: workflowName ?? workflow?.name ?? '',
            constantsCount: settingsCounts.constants,
            outputsCount: settingsCounts.outputs,
            selectedKind: settingsBKind ?? undefined,
            cardLayout: settingsBNodeLayout,
          }
        : undefined,
    [
      canEdit,
      settingsSurfaceVariant,
      workflowName,
      workflow?.name,
      settingsCounts.constants,
      settingsCounts.outputs,
      settingsBKind,
      settingsBNodeLayout,
    ]
  );

  const disabledTriggerIds = useMemo(() => {
    const hasManual = workflow?.triggers?.some((t) => t.type === 'manual');
    return hasManual ? (['manual'] as const) : undefined;
  }, [workflow?.triggers]);

  const transformed = useMemo(() => transformWorkflowToGraph(workflow), [workflow]);

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

  const applyMutation = useCallback(
    (result: MutationResult): boolean => {
      if (!result.success) {
        notifications.toasts.addDanger({
          title: i18n.translate('workflows.visualEditor.mutationFailed', {
            defaultMessage: 'Could not update the workflow',
          }),
          text: result.error,
        });
        return false;
      }
      dispatch(setYamlString(result.yaml));
      // Visual mutations must update the graph in the same tick as the YAML
      // write — the middleware's typing debounce would otherwise leave the
      // canvas empty for ~250ms after Done (draft cleared, structure not yet).
      flushWorkflowComputation();
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
      }
      const ok = applyMutation(result);
      if (ok && newName) {
        // Node ids follow step names for non-colliding names.
        setFlashNodeId(newName);
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
        const triggerLabel = TRIGGER_LABEL[action.id] ?? action.label;
        setPendingInsert({
          phase: 'configuring',
          context: { mode: 'trigger' },
          stepType: action.id,
          label: triggerLabel,
        });
        setPanel({
          mode: 'insert-trigger',
          triggerType: action.id,
          triggerLabel,
          fragment,
        });
        setInsertion(null);
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
      const result = replaceStepFragment(yamlStringRef.current, current.stepName, fragment);
      if (!applyMutation(result)) return;
      lastAppliedStepFragmentRef.current = fragment;
      lastAppliedYamlRef.current = result.yaml;
      if (isRename) {
        // Node ids follow step names — flush so nodeRefs carries the new id
        // in this same tick (the selection effect below would otherwise miss
        // the step for the rest of the 250ms computation debounce window).
        flushWorkflowComputation();
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

  /** ✕ / Escape: every edit is already live in the YAML, so this just closes. */
  const handleStepClose = useCallback(() => {
    setPanel(null);
    setSelectedStep(null);
  }, [setSelectedStep]);

  /** Trigger-only: triggers keep the draft-then-Done flow. */
  const handlePanelSave = useCallback(
    (fragment: string) => {
      if (!panel) return;
      const isInsert = panel.mode === 'insert-trigger';
      // Keep the configuring draft visible until the computed graph includes the
      // new node — clearing it eagerly opens a window where the empty-state CTA
      // flashes (even with a sync flush, an extra render can land in between).
      if (isInsert) {
        clearPendingAfterDefinitionRef.current = true;
      } else {
        setPendingInsert(null);
      }

      let applied = true;
      if (panel.mode === 'insert-trigger') {
        applied = applyMutation(appendTrigger(editorYaml, fragment));
      } else if (panel.mode === 'edit-trigger') {
        applied = applyMutation(replaceTriggerFragment(editorYaml, panel.triggerIndex, fragment));
      }

      if (isInsert && !applied) {
        clearPendingAfterDefinitionRef.current = false;
        setPendingInsert(null);
      }
      setPanel(null);
    },
    [panel, applyMutation, editorYaml]
  );

  /** Trigger-only: triggers keep the draft-then-Done flow (Cancel commits the partial draft). */
  const handlePanelCancel = useCallback(() => {
    if (panel?.mode === 'insert-trigger') {
      clearPendingAfterDefinitionRef.current = true;
      applyMutation(appendTrigger(editorYaml, panel.fragment));
    } else {
      clearPendingAfterDefinitionRef.current = false;
    }
    setPanel(null);
    setSettingsBKind(null);
    setPendingInsert(null);
    setSelectedStep(null);
  }, [panel, applyMutation, editorYaml, setSelectedStep]);

  /** Steps live-apply, so switching the canvas/URL selection never loses anything. */
  const requestStepSelect = useCallback(
    (id: string | undefined) => {
      setSettingsBKind(null);
      setSelectedStep(id ?? null);
    },
    [setSelectedStep]
  );

  const panelIsFallbackStep = useMemo(() => {
    if (panel?.mode !== 'edit') return false;
    const ref = Object.values(transformed.nodeRefs).find(
      (r) => r.kind === 'step' && r.stepName === panel.stepName
    );
    return Boolean(ref && ref.kind === 'step' && ref.fallbackOf);
  }, [panel, transformed.nodeRefs]);

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
      // Don't clobber an in-progress trigger insert; skip no-op re-opens
      // (also covers the step we just opened via insert — same stepName,
      // same panel, so origin/fragment/yamlBeforeOpen must not be reset).
      if (current?.mode === 'insert-trigger') return;
      if (current?.mode === 'edit' && current.stepName === stepName) return;
      setInsertion(null);
      setPendingInsert(null);
      setSettingsBKind(null);
      // Baseline the live-apply dedup to the fragment we're opening with, so
      // the panel's first onFragmentChange (its own mount value) is a no-op.
      lastAppliedStepFragmentRef.current = fragment;
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
      const trigger = workflow?.triggers?.[triggerIndex];
      const fragment =
        getTriggerFragment(editorYaml, triggerIndex) ??
        (trigger ? stringifyYaml(trigger, { lineWidth: 0 }) : undefined);
      if (!fragment || !trigger) return;
      const triggerType = trigger.type;
      const triggerLabel = TRIGGER_LABEL[triggerType] ?? triggerType;
      setInsertion(null);
      setPendingInsert(null);
      setSettingsBKind(null);
      setPanel((current) => {
        if (current?.mode === 'insert-trigger') return current;
        if (
          current?.mode === 'edit-trigger' &&
          current.triggerIndex === triggerIndex &&
          current.fragment === fragment
        ) {
          return current;
        }
        return { mode: 'edit-trigger', triggerIndex, triggerType, triggerLabel, fragment };
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
    if (!canEdit) return;
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
  }, [canEdit, selectedStepId]);

  const editActions = useMemo<WorkflowGraphEditActions | undefined>(() => {
    if (!canEdit) return undefined;
    return {
      onInsert: (context, anchor) => {
        setPanel(null);
        setSettingsBKind(null);
        setSelectedStep(null);
        setInsertion({ context, anchor });
        const pendingContext = toPendingContext(context, nodeIdForStepName);
        setPendingInsert(pendingContext ? { phase: 'choosing', context: pendingContext } : null);
      },
      onEditStep: (nodeId) => {
        requestStepSelect(nodeId);
      },
      onDeleteNode: (nodeId) => {
        const ref = transformed.nodeRefs[nodeId];
        if (!ref) return;
        const isFallback =
          ref.kind === 'step' &&
          Boolean(
            (
              transformed.nodes.find((n) => n.id === nodeId)?.data as
                | { fallbackOf?: string }
                | undefined
            )?.fallbackOf
          );
        const yamlBeforeDelete = yamlString;
        const result =
          ref.kind === 'trigger'
            ? deleteTrigger(yamlString, ref.triggerIndex)
            : deleteStepByName(yamlString, ref.stepName);
        if (!applyMutation(result)) return;
        if (selectedStepId === nodeId) setSelectedStep(null);
        if (panel?.mode === 'edit' && ref.kind === 'step' && panel.stepName === ref.stepName) {
          setPanel(null);
        }
        if (
          panel?.mode === 'edit-trigger' &&
          ref.kind === 'trigger' &&
          panel.triggerIndex === ref.triggerIndex
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
                  dispatch(setYamlString(yamlBeforeDelete));
                },
              },
            },
          },
          // Give the user time to recover a destructive delete (nested paths go with the step).
          { toastLifeTimeMs: 10000 }
        );
      },
    };
  }, [
    canEdit,
    requestStepSelect,
    setSelectedStep,
    yamlString,
    applyMutation,
    transformed.nodeRefs,
    transformed.nodes,
    selectedStepId,
    panel,
    notifications.toasts,
    dispatch,
    nodeIdForStepName,
  ]);

  const flyoutTarget = useMemo<FlyoutTarget | null>(() => {
    if (!selectedStepId) return null;
    const ref = transformed.nodeRefs[selectedStepId];
    if (!ref) return null;
    // Edit mode opens config panels for steps and triggers instead of the
    // read-only YAML flyout.
    if (canEdit) return null;
    if (ref.kind === 'step') {
      return {
        kind: 'step',
        stepName: ref.stepName,
        stepInfo: workflowLookup?.steps[ref.stepName],
      };
    }
    // kind === 'trigger' — use the exact declaration-order index so two
    // triggers of the same type are distinguished correctly.
    const trigger = workflow?.triggers?.[ref.triggerIndex];
    if (trigger) {
      const yamlSnippet = stringifyYaml({ triggers: [trigger] });
      return {
        kind: 'trigger',
        triggerType: trigger.type,
        triggerLabel: TRIGGER_LABEL[trigger.type] ?? trigger.type,
        yamlSnippet,
      };
    }
    return null;
  }, [selectedStepId, transformed.nodeRefs, workflowLookup, workflow, canEdit]);

  const renderStepIcon = useCallback<RenderStepIcon>(
    ({ stepType, isTrigger: _isTrigger, color }) => (
      <StepIcon stepType={stepType} executionStatus={undefined} iconColor={color} />
    ),
    []
  );

  const handleRunStep = useCallback(() => {
    if (!flyoutTarget || flyoutTarget.kind !== 'step') return;
    onStepRun?.({ stepId: flyoutTarget.stepName, actionType: 'run' });
  }, [onStepRun, flyoutTarget]);

  const handleOpenInYaml = useCallback(() => {
    // Tell the YAML editor which step to reveal — it watches the
    // `highlightedStepId` slice and calls `revealLineInCenter` on the
    // matching line when it changes.
    if (flyoutTarget?.kind === 'step') {
      dispatch(setHighlightedStepId({ stepId: flyoutTarget.stepName }));
    } else if (flyoutTarget?.kind === 'trigger') {
      dispatch(setHighlightedStepId({ stepId: HIGHLIGHTED_STEP_TRIGGER }));
    }
    setEditorView('yaml');
  }, [dispatch, flyoutTarget, setEditorView]);

  const handleStepSelect = useCallback(
    (id: string | undefined) => {
      requestStepSelect(id);
    },
    [requestStepSelect]
  );

  const handleSettingsNodeSelect = useCallback(
    (kind: WorkflowSettingsBPanelKind | undefined) => {
      if (kind == null) {
        setSettingsBKind(null);
        return;
      }
      openSettingsBPanel(kind);
    },
    [openSettingsBPanel]
  );

  const handleStepRun = useCallback(
    (stepName: string) => onStepRun?.({ stepId: stepName, actionType: 'run' }),
    [onStepRun]
  );

  const handleFlyoutKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setSelectedStep(null);
      }
    },
    [setSelectedStep]
  );

  const handleFlyoutClose = useCallback(() => setSelectedStep(null), [setSelectedStep]);

  const closeInsertion = useCallback(() => {
    setInsertion(null);
    setPendingInsert((current) => (current?.phase === 'choosing' ? null : current));
  }, []);

  // ⌘Z / Ctrl+Z on the canvas delegates to Monaco's undo stack (ADR-0005).
  useEffect(() => {
    if (!editorRef) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      // Let Monaco handle it when focus is already inside the editor.
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('.monaco-editor')) {
        return;
      }
      event.preventDefault();
      editorRef.current?.trigger('graph-gesture', 'undo', null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorRef]);

  const handleCreationPickTrigger = useCallback((triggerType: 'manual' | 'alert' | 'scheduled') => {
    const triggerLabel = TRIGGER_LABEL[triggerType] ?? triggerType;
    setPendingInsert({
      phase: 'configuring',
      context: { mode: 'trigger' },
      stepType: triggerType,
      label: triggerLabel,
    });
    setPanel({
      mode: 'insert-trigger',
      triggerType,
      triggerLabel,
      fragment: triggerFragmentFor(triggerType),
    });
  }, []);

  const handleCreationPickAction = useCallback((anchor: DOMRect) => {
    const context = { mode: 'step' as const, index: 0 };
    setInsertion({
      context,
      anchor: {
        left: anchor.left,
        top: anchor.top,
        width: anchor.width,
        height: anchor.height,
      },
    });
  }, []);

  const handleBrowseTemplates = useCallback(() => {
    void application.navigateToApp(PLUGIN_ID, { deepLinkId: 'library' });
  }, [application]);

  const handleGenerateWithAi = useCallback(
    (prompt: string) => {
      openAgentChat({ initialMessage: prompt, autoSendInitialMessage: true });
    },
    [openAgentChat]
  );

  const handleApplyTemplateYaml = useCallback(
    (yaml: string) => {
      dispatch(setYamlString(yaml));
    },
    [dispatch]
  );

  const creationEmptyState = useMemo(
    () =>
      canEdit && showCreationEmptyState ? (
        <WorkflowCreationPanel
          isAiAvailable={isAgentBuilderAvailable}
          onGenerateWithAi={handleGenerateWithAi}
          onPickTrigger={handleCreationPickTrigger}
          onPickAction={handleCreationPickAction}
          onBrowseTemplates={handleBrowseTemplates}
          onApplyTemplateYaml={handleApplyTemplateYaml}
        />
      ) : undefined,
    [
      canEdit,
      showCreationEmptyState,
      isAgentBuilderAvailable,
      handleGenerateWithAi,
      handleCreationPickTrigger,
      handleCreationPickAction,
      handleBrowseTemplates,
      handleApplyTemplateYaml,
    ]
  );

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
        canRunSteps={Boolean(canExecuteWorkflow) && isYamlValid && !isExecutionsTab}
        defaultViewport={defaultViewport}
        onViewportChange={onViewportChange}
        showZoomControls
        edit={editActions}
        nodeConfigWarnings={nodeConfigWarnings}
        flashNodeId={flashNodeId}
        emptyState={creationEmptyState}
        pendingInsert={pendingInsert ?? undefined}
        suppressInsertionControls={insertion != null}
        settingsNodes={settingsNodesProp}
        onSettingsNodeSelect={
          canEdit && settingsSurfaceVariant === 'b' ? handleSettingsNodeSelect : undefined
        }
      />
      {canEdit && settingsSurfaceVariant === 'c' ? (
        <WorkflowSettingsCSurface
          workflowId={workflowId}
          readOnly={!canEdit}
          canvasHeight={canvasHeight || 600}
        />
      ) : null}
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
            <StepConfigPanel
              mode={panel.origin}
              stepType={panel.stepType}
              actionLabel={panel.actionLabel}
              initialFragment={panel.fragment}
              connectors={connectors}
              workflowDefinition={workflow}
              onClose={handleStepClose}
              onRevert={handleStepRevert}
              isFallbackStep={panelIsFallbackStep}
              onExpandedChange={setFieldEditorExpanded}
              onFragmentChange={handleStepDraftChange}
            />
          </KibanaSectionErrorBoundary>
        </CanvasConfigPanelShell>
      )}
      {panel && (panel.mode === 'edit-trigger' || panel.mode === 'insert-trigger') && (
        <CanvasConfigPanelShell
          width={panelWidth}
          onWidthChange={(w) => setStoredPanelWidth(w)}
          canvasWidth={canvasWidth}
          data-test-subj="workflowTriggerConfigPanelContainer"
        >
          <TriggerConfigPanel
            key={
              panel.mode === 'edit-trigger'
                ? `edit-trigger:${panel.triggerIndex}`
                : `insert-trigger:${panel.triggerType}`
            }
            triggerType={panel.triggerType}
            triggerLabel={panel.triggerLabel}
            initialFragment={panel.fragment}
            workflowYaml={editorYaml}
            onCancel={handlePanelCancel}
            onSave={handlePanelSave}
          />
        </CanvasConfigPanelShell>
      )}
      {settingsBKind && settingsSurfaceVariant === 'b' && (
        <CanvasConfigPanelShell
          width={panelWidth}
          onWidthChange={setStoredPanelWidth}
          canvasWidth={canvasWidth}
          data-test-subj="workflowSettingsBPanelContainer"
        >
          <WorkflowSettingsBPanel
            key={settingsBKind}
            kind={settingsBKind}
            readOnly={!canEdit}
            onClose={closeSettingsBPanel}
          />
        </CanvasConfigPanelShell>
      )}
      {flyoutTarget && !panel && !settingsBKind && (
        <EuiFocusTrap returnFocus>
          <div
            ref={flyoutPanelRef}
            // tabIndex={-1} makes the panel div programmatically focusable
            // (so the useEffect above can call .focus()) without adding it to
            // the natural tab order — EuiFocusTrap handles tab cycling inside.
            tabIndex={-1}
            onKeyDown={handleFlyoutKeyDown}
            css={[
              {
                position: 'absolute',
                top: PANEL_MARGIN,
                right: PANEL_MARGIN,
                bottom: PANEL_MARGIN,
                width: 420,
                zIndex: euiTheme.levels.flyout,
                borderRadius: WORKFLOWS_SURFACE_RADIUS,
                overflow: 'hidden',
                outline: 'none',
              },
              floatingShadow,
            ]}
          >
            <WorkflowVisualEditorFlyout
              target={flyoutTarget}
              editorYaml={editorYaml}
              canExecuteWorkflow={Boolean(canExecuteWorkflow) && !isExecutionsTab}
              isYamlValid={isYamlValid}
              onClose={handleFlyoutClose}
              onOpenInYaml={handleOpenInYaml}
              onRunStep={handleRunStep}
            />
          </div>
        </EuiFocusTrap>
      )}
    </div>
  );
};
