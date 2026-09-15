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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { Document, isSeq, parseDocument, stringify as stringifyYaml } from 'yaml';
import type { Node as YamlNode } from 'yaml';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
} from '@kbn/workflows-ui';
import { StepConfigPanel } from './step_config_panel';
import { useCreationAgentChat } from './use_creation_agent_chat';
import { WorkflowCreationPanel } from './workflow_creation_panel';
import { type FlyoutTarget, WorkflowVisualEditorFlyout } from './workflow_visual_editor_flyout';
import { PLUGIN_ID } from '../../../../common';
import { getAllConnectorsWithDynamic } from '../../../../common/schema';
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
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  HIGHLIGHTED_STEP_TRIGGER,
  setHighlightedStepId,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { useKibana } from '../../../hooks/use_kibana';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { triggerSchemas } from '../../../trigger_schemas';
import { generateTriggerSnippet } from '../../../widgets/workflow_yaml_editor/lib/snippets/generate_trigger_snippet';
import { type ActionOptionData, ActionsMenuPopover } from '../../actions_menu_popover';
import { collectStepsByName } from '../lib/collect_steps';
import { buildDefaultStep, isStepIncomplete } from '../lib/step_form_schema';
import {
  appendTrigger,
  collectStepNames,
  deleteStepByName,
  deleteTrigger,
  getStepFragment,
  insertStepAtPath,
  type MutationResult,
  replaceStepFragment,
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
}

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};

/** Floating-panel inset from the canvas edges (top, right, bottom). */
const PANEL_MARGIN = 16;
const CONFIG_PANEL_WIDTH_STORAGE_KEY = 'workflows:configPanelWidth';
const DEFAULT_CONFIG_PANEL_WIDTH = 560;
const MIN_CONFIG_PANEL_WIDTH = 420;
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

const toPendingContext = (
  context: WorkflowGraphInsertionContext
): PendingInsertStepContext | undefined => {
  if (context.mode === 'step') {
    return {
      mode: 'step',
      index: context.index,
      path: context.path,
      sourceNodeId: context.sourceNodeId,
    };
  }
  if (context.mode === 'error') return { mode: 'error', stepId: context.stepId };
  return undefined;
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
}) => {
  const { colorMode, euiTheme } = useEuiTheme();
  const floatingShadow = useEuiShadow('m');
  const { notifications, application } = useKibana().services;
  const [storedPanelWidth = DEFAULT_CONFIG_PANEL_WIDTH, setStoredPanelWidth] = useLocalStorage(
    CONFIG_PANEL_WIDTH_STORAGE_KEY,
    DEFAULT_CONFIG_PANEL_WIDTH
  );
  const panelWidth = Math.min(
    Math.max(storedPanelWidth, MIN_CONFIG_PANEL_WIDTH),
    typeof window !== 'undefined' ? window.innerWidth * 0.5 : DEFAULT_CONFIG_PANEL_WIDTH
  );

  const definition = useSelector(selectEditorWorkflowDefinition);
  const stepExecutions = useSelector(selectStepExecutions);
  const isExecutionsTab = useSelector(selectIsExecutionsTab);
  const isYamlValid = useSelector(selectIsYamlSyntaxValid) ?? true;
  const editorYaml = useSelector(selectEditorYaml) ?? '';
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

  // Focus the flyout panel when a step becomes selected so keyboard users
  // land inside the panel rather than remaining on the canvas node.
  useEffect(() => {
    if (selectedStepId) {
      flyoutPanelRef.current?.focus();
    }
  }, [selectedStepId]);

  useEffect(() => {
    if (!flashNodeId) return;
    const timer = setTimeout(() => setFlashNodeId(undefined), FLASH_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [flashNodeId]);

  const workflow = definition ?? lastValidRef.current;

  const transformed = useMemo(() => transformWorkflowToGraph(workflow), [workflow]);

  const stepsByName = useMemo(() => collectStepsByName(workflow), [workflow]);

  const incompleteNodeIds = useMemo(() => {
    if (!canEdit) return undefined;
    return new Set(
      Object.entries(transformed.nodeRefs)
        .filter(([, ref]) => {
          if (ref.kind !== 'step') return false;
          const step = stepsByName.get(ref.stepName);
          return step !== undefined && isStepIncomplete(step, connectors);
        })
        .map(([nodeId]) => nodeId)
    );
  }, [canEdit, transformed.nodeRefs, stepsByName, connectors]);

  const stepNameOf = useCallback(
    (nodeId: string): string | undefined => {
      const ref = transformed.nodeRefs[nodeId];
      return ref?.kind === 'step' ? ref.stepName : undefined;
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
      return true;
    },
    [dispatch, notifications.toasts]
  );

  const closeSurfaces = useCallback(() => {
    setInsertion(null);
    setPanel(null);
    setPendingInsert(null);
  }, []);

  /** Inserts a step fragment per the insertion context and flashes the new node. */
  const insertFragment = useCallback(
    (context: WorkflowGraphInsertionContext, fragment: string, newName: string | undefined) => {
      let result: MutationResult;
      if (context.mode === 'trigger') {
        result = appendTrigger(editorYaml, fragment);
      } else if (context.mode === 'step') {
        result = insertStepAtPath(
          editorYaml,
          fragment,
          context.path ?? [],
          context.index
        );
      } else {
        const target = stepNameOf(context.stepId);
        result = target
          ? setStepFallback(editorYaml, target, fragment)
          : { success: false, yaml: editorYaml, error: `Step ${context.stepId} not found` };
      }
      if (applyMutation(result) && newName) {
        // Node ids follow step names for non-colliding names.
        setFlashNodeId(newName);
      }
    },
    [editorYaml, stepNameOf, applyMutation]
  );

  const defaultFragmentFor = useCallback(
    (action: ActionOptionData): { fragment: string; name?: string } => {
      const stepType = action.id;
      if (isTriggerType(stepType) || triggerSchemas.isRegisteredTriggerId(stepType)) {
        return { fragment: triggerFragmentFor(stepType) };
      }
      const taken = collectStepNames(editorYaml);
      const name = uniqueStepName(`${stepType.replaceAll('.', '_')}_step`, taken);
      const step = buildDefaultStep(stepType, name, connectors);
      return { fragment: stringifyYaml(step, { lineWidth: 0 }), name };
    },
    [editorYaml, connectors]
  );

  const handleAddDirectly = useCallback(
    (action: ActionOptionData) => {
      if (!insertion) return;
      const { fragment, name } = defaultFragmentFor(action);
      insertFragment(insertion.context, fragment, name);
      closeSurfaces();
    },
    [insertion, defaultFragmentFor, insertFragment, closeSurfaces]
  );

  /** Selecting an action opens the config panel; triggers insert immediately (no panel). */
  const handleInsertAction = useCallback(
    (action: ActionOptionData) => {
      if (!insertion) return;
      if (insertion.context.mode === 'trigger') {
        handleAddDirectly(action);
        return;
      }
      const pendingContext = toPendingContext(insertion.context);
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
    [insertion, handleAddDirectly, defaultFragmentFor]
  );

  const handlePanelSave = useCallback(
    (fragment: string) => {
      if (!panel) return;
      const parsedName = parseDocument(fragment).get('name');
      const newName = typeof parsedName === 'string' ? parsedName : undefined;
      setPendingInsert(null);
      if (panel.mode === 'insert') {
        insertFragment(panel.context, fragment, newName);
      } else if (applyMutation(replaceStepFragment(editorYaml, panel.stepName, fragment))) {
        if (newName && newName !== panel.stepName) setSelectedStep(newName);
      }
      setPanel(null);
    },
    [panel, insertFragment, applyMutation, editorYaml, setSelectedStep]
  );

  const handlePanelCancel = useCallback(() => {
    setPanel(null);
    setPendingInsert(null);
    setSelectedStep(null);
  }, [setSelectedStep]);

  const handleRevealErrorPort = useCallback(() => {
    if (!panel || panel.mode !== 'edit') return;
    // Existing canvas flash — reveals the owning node (error port lives on it).
    setFlashNodeId(panel.stepName);
  }, [panel]);

  const handleViewFallbackOnCanvas = useCallback(
    (stepName: string) => {
      setSelectedStep(stepName);
      setFlashNodeId(stepName);
    },
    [setSelectedStep]
  );

  const handleConfigPanelResizeStart = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = panelWidth;
      const onMove = (ev: PointerEvent) => {
        const delta = startX - ev.clientX;
        const maxWidth = window.innerWidth * 0.5;
        const next = Math.min(maxWidth, Math.max(MIN_CONFIG_PANEL_WIDTH, startWidth + delta));
        setStoredPanelWidth(next);
      };
      const onUp = (ev: PointerEvent) => {
        handle.releasePointerCapture(ev.pointerId);
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
      };
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    },
    [panelWidth, setStoredPanelWidth]
  );

  const panelIsFallbackStep = useMemo(() => {
    if (!panel) return false;
    if (panel.mode === 'insert') return panel.context.mode === 'error';
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
      setPanel({ mode: 'edit', stepName, stepType, fragment });
    },
    [stepsByName, editorYaml]
  );

  const editActions = useMemo<WorkflowGraphEditActions | undefined>(() => {
    if (!canEdit) return undefined;
    return {
      onInsert: (context, anchor) => {
        setPanel(null);
        setInsertion({ context, anchor });
        const pendingContext = toPendingContext(context);
        setPendingInsert(pendingContext ? { phase: 'choosing', context: pendingContext } : null);
      },
      onEditStep: (nodeId) => {
        const stepName = stepNameOf(nodeId);
        if (stepName) {
          setSelectedStep(nodeId);
          openEditPanel(stepName);
        } else {
          // Triggers have no config form; show the read-only flyout instead.
          setSelectedStep(nodeId);
        }
      },
      onDeleteNode: (nodeId) => {
        const ref = transformed.nodeRefs[nodeId];
        if (!ref) return;
        const isFallback = ref.kind === 'step' && Boolean(ref.fallbackOf);
        const yamlBeforeDelete = editorYaml;
        const result =
          ref.kind === 'trigger'
            ? deleteTrigger(editorYaml, ref.triggerIndex)
            : deleteStepByName(editorYaml, ref.stepName);
        if (!applyMutation(result)) return;
        if (selectedStepId === nodeId) setSelectedStep(null);
        if (panel?.mode === 'edit' && ref.kind === 'step' && panel.stepName === ref.stepName) {
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
    stepNameOf,
    openEditPanel,
    setSelectedStep,
    editorYaml,
    applyMutation,
    transformed.nodeRefs,
    selectedStepId,
    panel,
    notifications.toasts,
    dispatch,
  ]);

  const flyoutTarget = useMemo<FlyoutTarget | null>(() => {
    if (!selectedStepId) return null;
    const ref = transformed.nodeRefs[selectedStepId];
    if (!ref) return null;
    if (ref.kind === 'step') {
      // Edit mode opens the config panel for steps instead of the read-only flyout.
      if (canEdit) return null;
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
      setSelectedStep(id ?? null);
      if (!canEdit) return;
      if (!id) {
        setPanel(null);
        return;
      }
      const stepName = stepNameOf(id);
      if (stepName) openEditPanel(stepName);
    },
    [setSelectedStep, canEdit, stepNameOf, openEditPanel]
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


  const handleCreationPickTrigger = useCallback(
    (triggerType: 'manual' | 'alert' | 'scheduled') => {
      insertFragment({ mode: 'trigger' }, triggerFragmentFor(triggerType), undefined);
    },
    [insertFragment]
  );

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
    setPendingInsert({ phase: 'choosing', context });
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
      canEdit ? (
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
        incompleteNodeIds={incompleteNodeIds}
        flashNodeId={flashNodeId}
        emptyState={creationEmptyState}
        pendingInsert={pendingInsert ?? undefined}
        suppressInsertionControls={panel != null}
      />
      {insertion && (
        <ActionsMenuPopover
          isOpen
          closePopover={closeInsertion}
          insertionContext={{ mode: insertion.context.mode }}
          onActionSelected={handleInsertAction}
        />
      )}
      {panel && (
        <div
          css={[
            {
              position: 'absolute',
              top: PANEL_MARGIN,
              right: PANEL_MARGIN,
              bottom: PANEL_MARGIN,
              width: panelWidth,
              zIndex: euiTheme.levels.flyout,
              border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
              borderRadius: euiTheme.border.radius.small,
              background: euiTheme.colors.backgroundBasePlain,
              overflow: 'hidden',
            },
            floatingShadow,
          ]}
          data-test-subj="workflowStepConfigPanelContainer"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={i18n.translate('workflows.visualEditor.resizeConfigPanel', {
              defaultMessage: 'Resize configuration panel',
            })}
            data-test-subj="workflowStepConfigPanelResizeHandle"
            onPointerDown={handleConfigPanelResizeStart}
            css={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 6,
              cursor: 'ew-resize',
              zIndex: 2,
              touchAction: 'none',
            }}
          />
          <StepConfigPanel
            mode={panel.mode}
            stepType={panel.stepType}
            actionLabel={panel.mode === 'insert' ? panel.actionLabel : undefined}
            initialFragment={panel.fragment}
            connectors={connectors}
            workflowDefinition={workflow}
            onCancel={handlePanelCancel}
            onSave={handlePanelSave}
            isFallbackStep={panelIsFallbackStep}
            onRevealErrorPort={
              panel.mode === 'edit' && !panelIsFallbackStep ? handleRevealErrorPort : undefined
            }
            onViewFallbackOnCanvas={
              panel.mode === 'edit' && !panelIsFallbackStep
                ? handleViewFallbackOnCanvas
                : undefined
            }
          />
        </div>
      )}
      {flyoutTarget && !panel && (
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
                top: 8,
                right: 8,
                bottom: 8,
                width: 420,
                zIndex: euiTheme.levels.flyout,
                borderRadius: euiTheme.border.radius.small,
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
