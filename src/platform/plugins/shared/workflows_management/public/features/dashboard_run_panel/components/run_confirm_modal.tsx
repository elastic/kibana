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
  EuiDescriptionList,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { buildFieldsZodValidator } from '@kbn/workflows/spec/lib/build_fields_zod_validator';
import { applyInputDefaults } from '@kbn/workflows/spec/lib/field_conversion';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { WorkflowInputField } from './workflow_input_field';
import type { WorkflowRunInputMapping } from '../../../../server/dashboard_run_panel/schema';
import type { WorkflowInputDescriptor } from '../lib/describe_workflow_inputs';
import type {
  DashboardControlSnapshot,
  ResolvedWorkflowInputs,
} from '../lib/resolve_workflow_inputs';
import { CONFIRM_MESSAGES, SOURCE_LABELS } from '../translations';

export interface RunConfirmModalProps {
  workflowName: string;
  inputs: JsonModelSchemaType | undefined;
  descriptors: WorkflowInputDescriptor[];
  mappings: readonly WorkflowRunInputMapping[];
  resolved: ResolvedWorkflowInputs;
  controls: DashboardControlSnapshot[];
  isRunning: boolean;
  onCancel: () => void;
  onConfirm: (inputs: Record<string, unknown>) => void;
}

const describeSource = (
  mapping: WorkflowRunInputMapping | undefined,
  controls: DashboardControlSnapshot[]
): string => {
  switch (mapping?.source) {
    case 'control': {
      const control = controls.find(({ id }) => id === mapping.control_id);
      return SOURCE_LABELS.controlNamed(control?.label ?? mapping.control_id);
    }
    case 'time_range':
      return mapping.part
        ? `${SOURCE_LABELS.time_range} (${
            mapping.part === 'from' ? SOURCE_LABELS.timeFrom : SOURCE_LABELS.timeTo
          })`
        : SOURCE_LABELS.time_range;
    case 'query':
      return SOURCE_LABELS.query;
    case 'constant':
      return SOURCE_LABELS.constant;
    default:
      return SOURCE_LABELS.prompt;
  }
};

const previewValue = (value: unknown, descriptor: WorkflowInputDescriptor | undefined): string => {
  if (descriptor?.kind === 'time_range' && value && typeof value === 'object') {
    const { from, to } = value as { from?: string; to?: string };
    return `${from} → ${to}`;
  }
  if (descriptor?.kind === 'query' && value && typeof value === 'object') {
    const { query, filters } = value as {
      query?: { query?: unknown; esql?: unknown };
      filters?: unknown[];
    };
    const text = query?.query ?? query?.esql;
    const parts = [typeof text === 'string' && text.length > 0 ? text : undefined];
    if (filters?.length) parts.push(CONFIRM_MESSAGES.filtersCount(filters.length));
    return parts.filter(Boolean).join(' ') || '*';
  }
  if (Array.isArray(value)) return value.map(String).join(', ');
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

const formatIssuePath = (path: PropertyKey[], message: string): string =>
  path.length > 0 ? `${path.map(String).join('.')}: ${message}` : message;

/** Shows what the run will receive, lets the viewer fill in the rest, and validates before running. */
export const RunConfirmModal = ({
  workflowName,
  inputs,
  descriptors,
  mappings,
  resolved,
  controls,
  isRunning,
  onCancel,
  onConfirm,
}: RunConfirmModalProps): React.JSX.Element => {
  const titleId = useGeneratedHtmlId({ prefix: 'workflowRunConfirm' });
  const fieldIdPrefix = useGeneratedHtmlId({ prefix: 'workflowRunInput' });

  const fromDashboard = useMemo(
    () => descriptors.filter(({ name }) => name in resolved.values),
    [descriptors, resolved.values]
  );
  const editable = useMemo(
    () => descriptors.filter(({ name }) => !(name in resolved.values)),
    [descriptors, resolved.values]
  );

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const defaults = applyInputDefaults(undefined, inputs) ?? {};
    return Object.fromEntries(
      editable.filter(({ name }) => name in defaults).map(({ name }) => [name, defaults[name]])
    );
  });
  const [invalidJsonInputs, setInvalidJsonInputs] = useState<ReadonlySet<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validator = useMemo(() => buildFieldsZodValidator(inputs), [inputs]);
  const issuesByInput = useMemo(
    () => new Map(resolved.issues.map(({ input, message }) => [input, message])),
    [resolved.issues]
  );

  const submit = () => {
    const merged = { ...values, ...resolved.values };
    const result = validator.safeParse(applyInputDefaults(merged, inputs) ?? merged);
    if (!result.success) {
      setValidationErrors(
        result.error.issues.map(({ path, message }) => formatIssuePath(path, message))
      );
      return;
    }
    setValidationErrors([]);
    onConfirm(merged);
  };

  return (
    <EuiModal onClose={onCancel} aria-labelledby={titleId} maxWidth={640}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {CONFIRM_MESSAGES.title(workflowName)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {descriptors.length === 0 && <EuiText size="s">{CONFIRM_MESSAGES.noInputs}</EuiText>}

        {fromDashboard.length > 0 && (
          <>
            <EuiTitle size="xxs">
              <h3>{CONFIRM_MESSAGES.fromDashboard}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              compressed
              data-test-subj="workflowRunConfirmFromDashboard"
              listItems={fromDashboard.map((descriptor) => ({
                title: `${descriptor.label} · ${describeSource(
                  mappings.find(({ input }) => input === descriptor.name),
                  controls
                )}`,
                description: previewValue(resolved.values[descriptor.name], descriptor),
              }))}
            />
            <EuiSpacer />
          </>
        )}

        {editable.length > 0 && (
          <>
            <EuiTitle size="xxs">
              <h3>{CONFIRM_MESSAGES.yourInput}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {editable.map((descriptor) => {
              const id = `${fieldIdPrefix}-${descriptor.name}`;
              const issue = issuesByInput.get(descriptor.name);
              return (
                <EuiFormRow
                  key={descriptor.name}
                  id={`${id}-row`}
                  fullWidth
                  label={descriptor.kind === 'boolean' ? undefined : descriptor.label}
                  labelAppend={
                    descriptor.required ? (
                      <EuiText size="xs" color="subdued">
                        {CONFIRM_MESSAGES.required}
                      </EuiText>
                    ) : undefined
                  }
                  helpText={issue ? undefined : descriptor.description}
                  isInvalid={Boolean(issue)}
                  error={issue}
                >
                  <WorkflowInputField
                    id={id}
                    descriptor={descriptor}
                    value={values[descriptor.name]}
                    isInvalid={Boolean(issue)}
                    onChange={(value) =>
                      setValues((current) => ({ ...current, [descriptor.name]: value }))
                    }
                    onJsonValidityChange={(isValid) =>
                      setInvalidJsonInputs((current) => {
                        const next = new Set(current);
                        if (isValid) next.delete(descriptor.name);
                        else next.add(descriptor.name);
                        return next;
                      })
                    }
                  />
                </EuiFormRow>
              );
            })}
          </>
        )}

        {validationErrors.length > 0 && (
          <>
            <EuiSpacer />
            <KbnDangerCallout
              announceOnMount
              size="s"
              title={CONFIRM_MESSAGES.invalidTitle}
              data-test-subj="workflowRunConfirmValidationErrors"
            >
              <ul>
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </KbnDangerCallout>
          </>
        )}

        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          {CONFIRM_MESSAGES.runAs}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>{CONFIRM_MESSAGES.cancel}</EuiButtonEmpty>
        <EuiButton
          fill
          iconType="play"
          onClick={submit}
          isLoading={isRunning}
          isDisabled={invalidJsonInputs.size > 0}
          data-test-subj="workflowRunConfirmButton"
        >
          {CONFIRM_MESSAGES.run}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
