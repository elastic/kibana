/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFocusTrap,
  EuiLoadingSpinner,
  EuiText,
  useEuiShadow,
  useEuiTheme,
} from '@elastic/eui';
import type { ColorMode, Viewport } from '@xyflow/react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { Document, isSeq, parseDocument, stringify as stringifyYaml } from 'yaml';
import type { Node as YamlNode } from 'yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { monaco } from '@kbn/monaco';
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
  useWorkflowGraphPocToggles,
  useWorkflowsCapabilities,
  type WorkflowGraphAnchorRect,
  WorkflowGraphCanvasWithoutProvider,
  type WorkflowGraphEditActions,
  type WorkflowGraphInsertionContext,
  WORKFLOWS_SURFACE_RADIUS,
} from '@kbn/workflows-ui';
import { parseWorkflowYamlForAutocomplete } from '@kbn/workflows-yaml';
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
import { WorkflowSettingsSurfaceSwitcher } from './workflow_settings_surface_switcher';
import {
  getWorkflowSettingsBNodeLayout,
  getWorkflowSettingsSurfaceVariant,
  setWorkflowSettingsSurfaceVariant,
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
      readonly mode: 'insert';
      readonly context: WorkflowGraphInsertionContext;
      readonly stepType: string;
      readonly actionLabel: string;
      readonly fragment: string;
    }
  | {
      readonly mode: 'edit';
      readonly stepName: string;
      readonly stepType: string;
      readonly fragment: string;
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

  const canEdit = Boolean(canUpdateWorkflow) && !isExecutionsTab;

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
  const [liveFragment, setLiveFragment] = useState<string | null>(null);
  /** After insert Done: clear the draft on the next definition update (not eagerly). */
  const clearPendingAfterDefinitionRef = useRef(false);
  const [settingsSurfaceVariant, setSettingsSurfaceVariantState] =
    useState<WorkflowSettingsSurfaceVariant>(() => getWorkflowSettingsSurfaceVariant());
  const [settingsBNodeLayout, setSettingsBNodeLayoutState] = useState<WorkflowSettingsBNodeLayout>(
    () => getWorkflowSettingsBNodeLayout()
  );
  const [settingsBKind, setSettingsBKind] = useState<WorkflowSettingsBPanelKind | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [configPanelDirty, setConfigPanelDirty] = useState(false);
  /** When set, a discard confirm is open before navigating to this step id (null = deselect). */
  const [pendingStepSelection, setPendingStepSelection] = useState<string | null | undefined>(
    undefined
  );
  const [showCreationEmptyState, setShowCreationEmptyStateLocal] = useState(() =>
    getShowCreationEmptyState()
  );

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

  const handleSettingsSurfaceVariantChange = useCallback((next: WorkflowSettingsSurfaceVariant) => {
    setWorkflowSettingsSurfaceVariant(next);
    setSettingsSurfaceVariantState(next);
    setSettingsBKind(null);
  }, []);

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

  // Drop the insert draft only after the computed definition has updated, so
  // Done never briefly shows the empty-canvas CTA between clear and commit.
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

  // When the insert flyout is open, compute a live preview of the graph that
  // includes the in-flight step so the user sees branches (e.g. switch cases)
  // update as they type — without committing to the Redux store.
  //
  // Both workflow and transformed must come from the same preview YAML so that
  // useWorkflowLayout's topologyFingerprint (derived from workflow) changes when
  // the preview changes — otherwise dagre skips layout and the new node lands at {0,0}.
  const previewData = useMemo(() => {
    if (!panel) return null;
    // Use liveFragment when the user has edited the step (child effect fires first,
    // but parent panelKey effect may clear it on the same flush). Fall back to
    // panel.fragment (the default/initial YAML for the step) so the preview renders
    // immediately when the panel opens, before the user types anything.
    const fragment =
      liveFragment ?? (panel.mode === 'insert' || panel.mode === 'edit' ? panel.fragment : null);
    if (!fragment) return null;
    let mutation = null;
    if (panel.mode === 'insert') {
      const ctx = panel.context;
      mutation =
        ctx.mode === 'prepend-step'
          ? prependStep(yamlString, fragment)
          : ctx.mode === 'after'
          ? insertStepAfterName(yamlString, fragment, ctx.stepName)
          : ctx.mode === 'branch'
          ? insertStepIntoBranch(
              yamlString,
              fragment,
              ctx.stepName,
              ctx.branch,
              ctx.position ?? 'end'
            )
          : ctx.mode === 'fallback'
          ? setStepFallback(yamlString, ctx.stepName, fragment)
          : null;
    } else if (panel.mode === 'edit') {
      mutation = replaceStepFragment(yamlString, panel.stepName, fragment);
    }
    if (!mutation?.success) return null;
    const parseResult = parseWorkflowYamlForAutocomplete(mutation.yaml);
    if (!parseResult.success) return null;
    const previewWorkflow = parseResult.data as WorkflowYaml;
    return { workflow: previewWorkflow, transformed: transformWorkflowToGraph(previewWorkflow) };
  }, [liveFragment, panel, yamlString]);

  // Clear the live fragment when the panel closes or switches identity (e.g.
  // clicking the foreach node while an insert is pending would switch directly
  // from insert mode to edit mode, leaving the previous fragment in place for
  // one render and letting replaceStepFragment clobber the wrong step).
  const panelKey =
    panel == null
      ? null
      : panel.mode === 'edit'
      ? `edit:${panel.stepName}`
      : panel.mode === 'edit-trigger'
      ? `edit-trigger:${panel.triggerIndex}`
      : panel.mode === 'insert'
      ? `insert:${panel.context.mode}:${
          panel.context.mode === 'after' ||
          panel.context.mode === 'branch' ||
          panel.context.mode === 'fallback'
            ? panel.context.stepName
            : ''
        }`
      : `insert-trigger:${panel.mode}`;
  useEffect(() => {
    setLiveFragment(null);
  }, [panelKey]);

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
    ): boolean => {
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
      return ok;
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

  /** Selecting an action opens the config panel; triggers open the trigger panel. */
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
      const pendingContext = toPendingContext(insertion.context, nodeIdForStepName);
      const { fragment, name } = defaultFragmentFor(action);
      if (pendingContext) {
        setPendingInsert({
          phase: 'configuring',
          context: pendingContext,
          stepType: action.id,
          label: name ?? action.label,
        });
      }
      setPanel({
        mode: 'insert',
        context: insertion.context,
        stepType: action.id,
        actionLabel: action.label,
        fragment,
      });
      setInsertion(null);
    },
    [insertion, defaultFragmentFor, nodeIdForStepName]
  );

  const handlePanelSave = useCallback(
    (fragment: string) => {
      if (!panel) return;
      const isInsert = panel.mode === 'insert' || panel.mode === 'insert-trigger';
      // Keep the configuring draft visible until the computed graph includes the
      // new node — clearing it eagerly opens a window where the empty-state CTA
      // flashes (even with a sync flush, an extra render can land in between).
      if (isInsert) {
        clearPendingAfterDefinitionRef.current = true;
      } else {
        setPendingInsert(null);
      }

      let applied = true;
      if (panel.mode === 'insert') {
        const parsedName = parseDocument(fragment).get('name');
        const newName = typeof parsedName === 'string' ? parsedName : undefined;
        applied = insertFragment(panel.context, fragment, newName);
      } else if (panel.mode === 'edit') {
        const parsedName = parseDocument(fragment).get('name');
        const newName = typeof parsedName === 'string' ? parsedName : undefined;
        applied = applyMutation(replaceStepFragment(editorYaml, panel.stepName, fragment));
        if (applied && newName && newName !== panel.stepName) setSelectedStep(newName);
      } else if (panel.mode === 'insert-trigger') {
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
    [panel, insertFragment, applyMutation, editorYaml, setSelectedStep]
  );

  const pocToggles = useWorkflowGraphPocToggles();

  const handlePanelCancel = useCallback(() => {
    // Closing any insert flyout commits the partial fragment so the node
    // stays on the canvas — the author can keep editing it later.
    if (panel?.mode === 'insert') {
      const fragmentToCommit = liveFragment ?? panel.fragment;
      const nameVal = parseDocument(fragmentToCommit).get('name');
      const parsedName = typeof nameVal === 'string' ? nameVal : undefined;
      clearPendingAfterDefinitionRef.current = true;
      insertFragment(panel.context, fragmentToCommit, parsedName);
    } else if (panel?.mode === 'insert-trigger') {
      clearPendingAfterDefinitionRef.current = true;
      applyMutation(appendTrigger(editorYaml, panel.fragment));
    } else {
      clearPendingAfterDefinitionRef.current = false;
    }
    setPanel(null);
    setSettingsBKind(null);
    setPendingInsert(null);
    setConfigPanelDirty(false);
    setPendingStepSelection(undefined);
    setSelectedStep(null);
  }, [panel, liveFragment, insertFragment, applyMutation, editorYaml, setSelectedStep]);

  const isConfigPanelOpen =
    panel?.mode === 'edit' ||
    panel?.mode === 'insert' ||
    panel?.mode === 'edit-trigger' ||
    panel?.mode === 'insert-trigger';

  const requestStepSelect = useCallback(
    (id: string | undefined) => {
      const next = id ?? null;
      if (
        configPanelDirty &&
        isConfigPanelOpen &&
        next !== selectedStepId &&
        (panel?.mode === 'edit' || panel?.mode === 'insert')
      ) {
        setPendingStepSelection(next);
        return;
      }
      setSettingsBKind(null);
      setSelectedStep(next);
    },
    [configPanelDirty, isConfigPanelOpen, panel?.mode, selectedStepId, setSelectedStep]
  );

  const handleKeepEditingStep = useCallback(() => {
    setPendingStepSelection(undefined);
  }, []);

  const handleDiscardAndSelectStep = useCallback(() => {
    const next = pendingStepSelection;
    setPendingStepSelection(undefined);
    setConfigPanelDirty(false);
    clearPendingAfterDefinitionRef.current = false;
    setPendingInsert(null);
    setSettingsBKind(null);
    if (next == null) {
      setPanel(null);
      setSelectedStep(null);
      return;
    }
    setSelectedStep(next);
  }, [pendingStepSelection, setSelectedStep]);

  const panelIsFallbackStep = useMemo(() => {
    if (!panel) return false;
    if (panel.mode === 'insert') return panel.context.mode === 'fallback';
    if (panel.mode !== 'edit') return false;
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
      setInsertion(null);
      setPendingInsert(null);
      setSettingsBKind(null);
      setPanel((current) => {
        // Don't clobber an in-progress insert panel; skip no-op re-opens.
        if (current?.mode === 'insert' || current?.mode === 'insert-trigger') return current;
        if (current?.mode === 'edit' && current.stepName === stepName) return current;
        return { mode: 'edit', stepName, stepType, fragment };
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
        if (current?.mode === 'insert' || current?.mode === 'insert-trigger') return current;
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
        workflow={previewData?.workflow ?? workflow}
        transformed={previewData?.transformed ?? transformed}
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
        pendingInsert={previewData ? undefined : pendingInsert ?? undefined}
        suppressInsertionControls={insertion != null}
        settingsNodes={settingsNodesProp}
        onSettingsNodeSelect={
          canEdit && settingsSurfaceVariant === 'b' ? handleSettingsNodeSelect : undefined
        }
      />
      {canEdit ? (
        <WorkflowSettingsSurfaceSwitcher
          value={settingsSurfaceVariant}
          onChange={handleSettingsSurfaceVariantChange}
        />
      ) : null}
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
      {panel && (panel.mode === 'edit' || panel.mode === 'insert') && (
        <CanvasConfigPanelShell
          width={panelWidth}
          onWidthChange={setStoredPanelWidth}
          canvasWidth={canvasWidth}
        >
          <StepConfigPanel
            key={
              panel.mode === 'edit'
                ? `edit:${panel.stepName}`
                : `insert:${panel.stepType}:${panel.actionLabel}`
            }
            mode={panel.mode}
            stepType={panel.stepType}
            actionLabel={panel.mode === 'insert' ? panel.actionLabel : undefined}
            initialFragment={panel.fragment}
            connectors={connectors}
            workflowDefinition={workflow}
            onCancel={handlePanelCancel}
            onSave={handlePanelSave}
            isFallbackStep={panelIsFallbackStep}
            onExpandedChange={setFieldEditorExpanded}
            onDraftDirtyChange={setConfigPanelDirty}
            onFragmentChange={panel.mode === 'insert' ? setLiveFragment : undefined}
            keepNodeOnCancel={panel.mode === 'insert'}
          />
        </CanvasConfigPanelShell>
      )}
      {pendingStepSelection !== undefined ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.stepConfigPanel.discardTitle', {
            defaultMessage: 'Discard changes to this step?',
          })}
          onCancel={handleKeepEditingStep}
          onConfirm={handleDiscardAndSelectStep}
          cancelButtonText={i18n.translate('workflows.stepConfigPanel.keepEditing', {
            defaultMessage: 'Keep editing',
          })}
          confirmButtonText={i18n.translate('workflows.stepConfigPanel.discard', {
            defaultMessage: 'Discard',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="workflowStepConfigPanelLeaveStepModal"
        >
          <EuiText size="s">
            {i18n.translate('workflows.visualEditor.discardOnStepSwitchBody', {
              defaultMessage:
                "These edits haven't been applied to the step yet. Leaving this step will discard them.",
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}
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
