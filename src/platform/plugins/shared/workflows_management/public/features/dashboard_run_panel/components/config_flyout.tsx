/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { getInputsFromDefinition } from '@kbn/workflows/spec/lib/field_conversion';
import { isManualTrigger } from '@kbn/workflows/spec/schema/triggers/manual_trigger_schema';
import { WorkflowSelector } from '@kbn/workflows-ui';
import { WorkflowInputField } from './workflow_input_field';
import type {
  WorkflowRunConstantValue,
  WorkflowRunInputMapping,
} from '../../../../server/dashboard_run_panel/schema';
import { useWorkflowApi, useWorkflowDetail } from '../hooks/use_workflow_run_panel_queries';
import type {
  WorkflowInputDescriptor,
  WorkflowRunMappingSource,
} from '../lib/describe_workflow_inputs';
import { describeWorkflowInputs, getAllowedMappingSources } from '../lib/describe_workflow_inputs';
import type { DashboardControlSnapshot } from '../lib/resolve_workflow_inputs';
import { CONFIG_MESSAGES, DEFAULT_BUTTON_LABEL, SOURCE_LABELS } from '../translations';
import type { WorkflowRunPanelConfig } from '../types';

export interface ConfigFlyoutProps {
  http: HttpStart;
  ariaLabelledBy: string;
  controls: DashboardControlSnapshot[];
  initialConfig?: WorkflowRunPanelConfig;
  onSave: (config: WorkflowRunPanelConfig, workflowName: string | undefined) => void;
  onCancel: () => void;
}

type MappingDraft =
  | { source: 'prompt' }
  | { source: 'control'; control_id?: string }
  | { source: 'time_range'; part?: 'from' | 'to' }
  | { source: 'query' }
  | { source: 'constant'; value?: unknown };

type DraftSource = MappingDraft['source'];

const hasManualTrigger = (workflow: WorkflowListItemDto): boolean =>
  Boolean(workflow.definition?.triggers?.some((trigger) => isManualTrigger(trigger)));

const workflowSelectorConfig = {
  label: CONFIG_MESSAGES.workflow,
  filterFunction: (workflows: WorkflowListItemDto[]) => workflows.filter(hasManualTrigger),
};

const defaultDraft = (descriptor: WorkflowInputDescriptor): MappingDraft => {
  if (descriptor.kind === 'time_range') return { source: 'time_range' };
  if (descriptor.kind === 'query') return { source: 'query' };
  return { source: 'prompt' };
};

const toDraft = (mapping: WorkflowRunInputMapping): MappingDraft => {
  switch (mapping.source) {
    case 'control':
      return { source: 'control', control_id: mapping.control_id };
    case 'time_range':
      return { source: 'time_range', part: mapping.part };
    case 'query':
      return { source: 'query' };
    case 'constant':
      return { source: 'constant', value: mapping.value };
  }
};

const toConstantValue = (value: unknown): WorkflowRunConstantValue | undefined => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return undefined;
};

const toMapping = (
  input: string,
  draft: MappingDraft,
  descriptor: WorkflowInputDescriptor
): WorkflowRunInputMapping | undefined => {
  switch (draft.source) {
    case 'control':
      return draft.control_id
        ? { input, source: 'control', control_id: draft.control_id }
        : undefined;
    case 'time_range':
      return descriptor.kind === 'time_range'
        ? { input, source: 'time_range' }
        : { input, source: 'time_range', part: draft.part ?? 'from' };
    case 'query':
      return { input, source: 'query' };
    case 'constant': {
      const value = toConstantValue(draft.value);
      return value === undefined ? undefined : { input, source: 'constant', value };
    }
    default:
      return undefined;
  }
};

const SOURCE_OPTION_LABELS: Record<DraftSource, string> = {
  prompt: SOURCE_LABELS.prompt,
  control: SOURCE_LABELS.control,
  time_range: SOURCE_LABELS.time_range,
  query: SOURCE_LABELS.query,
  constant: SOURCE_LABELS.constant,
};

interface MappingRowProps {
  descriptor: WorkflowInputDescriptor;
  draft: MappingDraft;
  controls: DashboardControlSnapshot[];
  onChange: (draft: MappingDraft) => void;
}

const MappingRow = ({ descriptor, draft, controls, onChange }: MappingRowProps) => {
  const id = useGeneratedHtmlId({ prefix: `workflowRunMapping-${descriptor.name}` });
  const sources: readonly WorkflowRunMappingSource[] = getAllowedMappingSources(descriptor);
  const sourceOptions = (['prompt', ...sources] as DraftSource[]).map((source) => ({
    value: source,
    text: SOURCE_OPTION_LABELS[source],
  }));

  const changeSource = (source: DraftSource) => {
    switch (source) {
      case 'control':
        return onChange({ source, control_id: controls.length === 1 ? controls[0].id : undefined });
      case 'time_range':
        return onChange({ source, part: descriptor.kind === 'time_range' ? undefined : 'from' });
      case 'constant':
        return onChange({ source, value: descriptor.defaultValue });
      default:
        return onChange({ source });
    }
  };

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj={`workflowRunMapping-${descriptor.name}`}>
      <EuiText size="s">
        <strong>{descriptor.label}</strong>
        {descriptor.required && (
          <EuiText size="xs" color="subdued" component="span">
            {` (${CONFIG_MESSAGES.required})`}
          </EuiText>
        )}
      </EuiText>
      {descriptor.description && (
        <EuiText size="xs" color="subdued">
          {descriptor.description}
        </EuiText>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap>
        <EuiFlexItem>
          <EuiFormRow label={CONFIG_MESSAGES.source} display="rowCompressed" fullWidth>
            <EuiSelect
              compressed
              fullWidth
              id={`${id}-source`}
              options={sourceOptions}
              value={draft.source}
              disabled={sources.length === 0}
              onChange={(event) => changeSource(event.target.value as DraftSource)}
              data-test-subj="workflowRunMappingSource"
            />
          </EuiFormRow>
        </EuiFlexItem>

        {draft.source === 'control' && (
          <EuiFlexItem>
            <EuiFormRow label={CONFIG_MESSAGES.control} display="rowCompressed" fullWidth>
              {controls.length === 0 ? (
                <EuiText size="xs" color="subdued">
                  {CONFIG_MESSAGES.noControls}
                </EuiText>
              ) : (
                <EuiSelect
                  compressed
                  fullWidth
                  id={`${id}-control`}
                  hasNoInitialSelection={!draft.control_id}
                  options={controls.map(({ id: controlId, label }) => ({
                    value: controlId,
                    text: label,
                  }))}
                  value={draft.control_id ?? ''}
                  onChange={(event) =>
                    onChange({ source: 'control', control_id: event.target.value })
                  }
                  data-test-subj="workflowRunMappingControl"
                />
              )}
            </EuiFormRow>
          </EuiFlexItem>
        )}

        {draft.source === 'time_range' && descriptor.kind !== 'time_range' && (
          <EuiFlexItem>
            <EuiFormRow label={CONFIG_MESSAGES.timePart} display="rowCompressed" fullWidth>
              <EuiSelect
                compressed
                fullWidth
                id={`${id}-part`}
                options={[
                  { value: 'from', text: SOURCE_LABELS.timeFrom },
                  { value: 'to', text: SOURCE_LABELS.timeTo },
                ]}
                value={draft.part ?? 'from'}
                onChange={(event) =>
                  onChange({
                    source: 'time_range',
                    part: event.target.value === 'to' ? 'to' : 'from',
                  })
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {draft.source === 'constant' && (
        <EuiFormRow
          label={descriptor.kind === 'boolean' ? undefined : CONFIG_MESSAGES.value}
          display="rowCompressed"
          fullWidth
        >
          <WorkflowInputField
            id={`${id}-value`}
            descriptor={
              descriptor.kind === 'boolean'
                ? { ...descriptor, label: CONFIG_MESSAGES.value }
                : descriptor
            }
            value={draft.value}
            onChange={(value) => onChange({ source: 'constant', value })}
          />
        </EuiFormRow>
      )}
    </EuiPanel>
  );
};

/** Flyout for choosing the workflow a panel runs and where each of its inputs comes from. */
export const ConfigFlyout = ({
  http,
  ariaLabelledBy,
  controls,
  initialConfig,
  onSave,
  onCancel,
}: ConfigFlyoutProps): React.JSX.Element => {
  const api = useWorkflowApi(http);
  const [workflowId, setWorkflowId] = useState(initialConfig?.workflow_id);
  const [buttonLabel, setButtonLabel] = useState(initialConfig?.button_label ?? '');
  const [drafts, setDrafts] = useState<Record<string, MappingDraft> | undefined>(() =>
    initialConfig?.input_mappings
      ? Object.fromEntries(
          initialConfig.input_mappings.map((mapping) => [mapping.input, toDraft(mapping)])
        )
      : undefined
  );

  const workflowQuery = useWorkflowDetail(api, workflowId);
  const descriptors = useMemo(
    () =>
      describeWorkflowInputs(getInputsFromDefinition(workflowQuery.data?.definition ?? undefined)),
    [workflowQuery.data?.definition]
  );

  const getDraft = (descriptor: WorkflowInputDescriptor): MappingDraft =>
    drafts?.[descriptor.name] ?? defaultDraft(descriptor);

  const save = () => {
    if (!workflowId) return;
    const inputMappings = descriptors.flatMap((descriptor) => {
      const mapping = toMapping(descriptor.name, getDraft(descriptor), descriptor);
      return mapping ? [mapping] : [];
    });
    onSave(
      {
        workflow_id: workflowId,
        button_label: buttonLabel.trim() || undefined,
        input_mappings: inputMappings,
      },
      workflowQuery.data?.name
    );
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>
            {initialConfig ? CONFIG_MESSAGES.editTitle : CONFIG_MESSAGES.createTitle}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow fullWidth helpText={CONFIG_MESSAGES.workflowHelp}>
          <WorkflowSelector
            selectedWorkflowId={workflowId}
            config={workflowSelectorConfig}
            onWorkflowChange={(selectedId) => {
              setWorkflowId(selectedId);
              setDrafts(undefined);
            }}
          />
        </EuiFormRow>

        <EuiFormRow label={CONFIG_MESSAGES.buttonLabel} fullWidth>
          <EuiFieldText
            fullWidth
            maxLength={100}
            placeholder={DEFAULT_BUTTON_LABEL}
            value={buttonLabel}
            onChange={(event) => setButtonLabel(event.target.value)}
            data-test-subj="workflowRunPanelButtonLabel"
          />
        </EuiFormRow>

        {workflowId && (
          <>
            <EuiSpacer />
            <EuiTitle size="xs">
              <h3>{CONFIG_MESSAGES.inputsTitle}</h3>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              {CONFIG_MESSAGES.inputsHelp}
            </EuiText>
            <EuiSpacer size="s" />
            {workflowQuery.isLoading ? (
              <EuiLoadingSpinner />
            ) : descriptors.length === 0 ? (
              <EuiText size="s">{CONFIG_MESSAGES.noInputs}</EuiText>
            ) : (
              <EuiFlexGroup direction="column" gutterSize="s">
                {descriptors.map((descriptor) => (
                  <EuiFlexItem key={descriptor.name} grow={false}>
                    <MappingRow
                      descriptor={descriptor}
                      draft={getDraft(descriptor)}
                      controls={controls}
                      onChange={(draft) =>
                        setDrafts((current) => ({ ...current, [descriptor.name]: draft }))
                      }
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            )}
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel}>{CONFIG_MESSAGES.cancel}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={save}
              isDisabled={!workflowId || workflowQuery.isLoading}
              data-test-subj="workflowRunPanelSave"
            >
              {CONFIG_MESSAGES.save}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
