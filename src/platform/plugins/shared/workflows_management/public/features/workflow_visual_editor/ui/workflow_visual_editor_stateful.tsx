/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type { ColorMode } from '@xyflow/react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { stringify as stringifyYaml } from 'yaml';
import { FormattedMessage } from '@kbn/i18n-react';
import { transformWorkflowToGraph, type WorkflowYaml } from '@kbn/workflows';
import { useWorkflowsCapabilities, WorkflowGraphCanvas } from '@kbn/workflows-ui';
import { type FlyoutTarget, WorkflowVisualEditorFlyout } from './workflow_visual_editor_flyout';
import {
  selectEditorWorkflowDefinition,
  selectEditorWorkflowLookup,
  selectEditorYaml,
  selectIsYamlSyntaxValid,
  selectStepExecutions,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useWorkflowUrlState } from '../../../hooks/use_workflow_url_state';

interface WorkflowVisualEditorStatefulProps {
  onStepRun?: (params: { stepId: string; actionType: string }) => void;
}

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'Manual',
  alert: 'Alert',
  scheduled: 'Scheduled',
};

/**
 * Glue layer between Redux + plugin services and the read-only graph canvas.
 *
 * - Selects the parsed workflow definition (cached when last valid).
 * - Holds the last-valid `WorkflowYaml` ref so the canvas keeps rendering
 *   when the user introduces a YAML syntax error.
 * - Wires `onStepRun` (received from the parent editor) to the flyout's
 *   "Run step" button so the existing context-override flow works as-is.
 */
export const WorkflowVisualEditorStateful: React.FC<WorkflowVisualEditorStatefulProps> = ({
  onStepRun,
}) => {
  const { colorMode } = useEuiTheme();

  const definition = useSelector(selectEditorWorkflowDefinition);
  const stepExecutions = useSelector(selectStepExecutions);
  const isYamlValid = useSelector(selectIsYamlSyntaxValid) ?? true;
  const editorYaml = useSelector(selectEditorYaml) ?? '';
  const workflowLookup = useSelector(selectEditorWorkflowLookup);
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const { selectedStepId, setSelectedStep, setEditorView } = useWorkflowUrlState();

  // POC pattern: cache the last valid WorkflowYaml so the canvas can stay
  // up while the user fixes a YAML syntax error.
  const lastValidRef = useRef<WorkflowYaml | undefined>(undefined);
  useEffect(() => {
    if (definition) {
      lastValidRef.current = definition as WorkflowYaml;
    }
  }, [definition]);

  const workflow = (definition as WorkflowYaml | undefined) ?? lastValidRef.current;

  // Build slug→step-name and slug→trigger maps by re-running the same
  // transform the canvas uses, so node ids line up with WorkflowLookup keys
  // for ALL steps (top-level, branches, foreach bodies, parallel branches).
  const { slugToName, slugToTrigger } = useMemo(() => {
    const nameMap: Record<string, string> = {};
    const triggerMap: Record<string, NonNullable<WorkflowYaml['triggers']>[number]> = {};
    if (!workflow) return { slugToName: nameMap, slugToTrigger: triggerMap };
    // The transform allocates trigger ids in declaration order, one per
    // trigger. We assume one trigger per type in practice (the common case);
    // map by stepType from the resulting node data back to the source trigger.
    const triggersByType = new Map<string, NonNullable<WorkflowYaml['triggers']>[number]>();
    for (const trigger of workflow.triggers ?? []) {
      if (!triggersByType.has(trigger.type)) triggersByType.set(trigger.type, trigger);
    }
    const { nodes, foreachGroups } = transformWorkflowToGraph(workflow);
    // Top-level + branches/parallel inner nodes live in `nodes`; nodes inside
    // a top-level foreach container live in `foreachGroups[].innerNodes`.
    const allNodes = [...nodes, ...foreachGroups.flatMap((g) => g.innerNodes)];
    for (const n of allNodes) {
      const data = n.data as { label?: string; stepType?: string };
      if (n.type === 'trigger') {
        const t = data.stepType ? triggersByType.get(data.stepType) : undefined;
        if (t) triggerMap[n.id] = t;
      } else if (typeof data.label === 'string') {
        nameMap[n.id] = data.label;
      }
    }
    return { slugToName: nameMap, slugToTrigger: triggerMap };
  }, [workflow]);

  const flyoutTarget = useMemo<FlyoutTarget | null>(() => {
    if (!selectedStepId) return null;
    const stepName = slugToName[selectedStepId];
    if (stepName) {
      return {
        kind: 'step',
        stepName,
        stepInfo: workflowLookup?.steps[stepName],
      };
    }
    const trigger = slugToTrigger[selectedStepId];
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
  }, [selectedStepId, slugToName, slugToTrigger, workflowLookup]);

  const handleRunStep = useCallback(() => {
    if (!flyoutTarget || flyoutTarget.kind !== 'step') return;
    onStepRun?.({ stepId: flyoutTarget.stepName, actionType: 'run' });
  }, [onStepRun, flyoutTarget]);

  const handleOpenInYaml = useCallback(() => {
    setEditorView('yaml');
  }, [setEditorView]);

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
    <div css={{ position: 'relative', width: '100%', height: '100%' }}>
      <WorkflowGraphCanvas
        workflow={workflow}
        stepExecutions={stepExecutions}
        isYamlValid={isYamlValid}
        selectedStepId={selectedStepId}
        onStepSelect={(id) => setSelectedStep(id ?? null)}
        colorMode={colorMode.toLowerCase() as ColorMode}
      />
      {flyoutTarget && (
        <WorkflowVisualEditorFlyout
          target={flyoutTarget}
          editorYaml={editorYaml}
          canExecuteWorkflow={Boolean(canExecuteWorkflow)}
          isYamlValid={isYamlValid}
          onClose={() => setSelectedStep(null)}
          onOpenInYaml={handleOpenInYaml}
          onRunStep={handleRunStep}
        />
      )}
    </div>
  );
};
