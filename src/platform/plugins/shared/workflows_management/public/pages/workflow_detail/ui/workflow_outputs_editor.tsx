/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { buildDataReferenceCatalog } from '../../../features/workflow_visual_editor/lib/build_data_reference_catalog';
import {
  SettingsEntryListHost,
  SettingsEntryRow,
} from './settings_entry_row';
import type { SettingsEditorAddControls } from './workflow_constants_editor';
import { createEmptyOutput, type OutputField } from './workflow_settings_fields_model';

export interface WorkflowOutputsEditorProps {
  readonly fields: readonly OutputField[];
  readonly onChange: (next: readonly OutputField[]) => void;
  readonly workflowDefinition: WorkflowYaml | undefined;
  readonly connectors: readonly ConnectorContractUnion[];
  readonly findReferencingSteps?: (name: string) => string[];
  readonly readOnly?: boolean;
  /**
   * When this value changes, any uncommitted draft row is discarded silently
   * (e.g. Option C popover collapse).
   */
  readonly discardDraftSignal?: number;
  /**
   * Hide the in-content Add CTA (and empty-state action). Use with
   * {@link onAddControlsChange} to place Add on an accordion header row.
   */
  readonly hideInlineAddButton?: boolean;
  /** Publishes Add controls for an external CTA (accordion `extraAction`). */
  readonly onAddControlsChange?: (controls: SettingsEditorAddControls | null) => void;
}

export function WorkflowOutputsEditor({
  fields,
  onChange,
  workflowDefinition,
  connectors,
  findReferencingSteps,
  readOnly = false,
  discardDraftSignal,
  hideInlineAddButton = false,
  onAddControlsChange,
}: WorkflowOutputsEditorProps) {
  const [draftField, setDraftField] = useState<OutputField | null>(null);

  useEffect(() => {
    if (discardDraftSignal === undefined) return;
    setDraftField(null);
  }, [discardDraftSignal]);
  const [pendingDelete, setPendingDelete] = useState<{
    field: OutputField;
    steps: string[];
  } | null>(null);
  const [pendingRename, setPendingRename] = useState<{
    field: OutputField;
    nextName: string;
    steps: string[];
  } | null>(null);

  const catalog = useMemo(
    () =>
      buildDataReferenceCatalog({
        definition: workflowDefinition,
        currentStepName: '',
        connectors,
        stepsScope: 'allSteps',
      }),
    [workflowDefinition, connectors]
  );

  const handleAdd = useCallback(() => {
    if (draftField || readOnly) return;
    const nextIndex = fields.length + 1;
    setDraftField(createEmptyOutput({ name: `output_${nextIndex}` }));
  }, [draftField, fields.length, readOnly]);

  useEffect(() => {
    if (!onAddControlsChange) return undefined;
    onAddControlsChange(
      readOnly ? null : { onAdd: handleAdd, disabled: draftField != null }
    );
    return () => onAddControlsChange(null);
  }, [onAddControlsChange, readOnly, handleAdd, draftField]);

  const commitDelete = useCallback(
    (field: OutputField) => {
      onChange(fields.filter((f) => f.id !== field.id));
      setPendingDelete(null);
    },
    [fields, onChange]
  );

  const requestDelete = useCallback(
    (field: OutputField) => {
      const steps = field.name.trim() ? findReferencingSteps?.(field.name.trim()) ?? [] : [];
      if (steps.length > 0) {
        setPendingDelete({ field, steps });
        return;
      }
      commitDelete(field);
    },
    [commitDelete, findReferencingSteps]
  );

  const handleUpdate = useCallback(
    (next: OutputField) => {
      const prev = fields.find((f) => f.id === next.id);
      if (
        prev &&
        prev.name.trim() &&
        next.name.trim() &&
        prev.name.trim() !== next.name.trim()
      ) {
        const steps = findReferencingSteps?.(prev.name.trim()) ?? [];
        setPendingRename({ field: next, nextName: next.name, steps });
        onChange(fields.map((f) => (f.id === next.id ? { ...next, name: prev.name } : f)));
        return;
      }
      onChange(fields.map((f) => (f.id === next.id ? next : f)));
    },
    [fields, findReferencingSteps, onChange]
  );

  const commitDraft = useCallback(
    (next: OutputField) => {
      onChange([...fields, next]);
      setDraftField(null);
    },
    [fields, onChange]
  );

  const addButton =
    readOnly || hideInlineAddButton ? null : (
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="both"
            color="primary"
            iconType="plusCircle"
            onClick={handleAdd}
            isDisabled={draftField != null}
            data-test-subj="workflowSettingsOutputAdd"
          >
            {i18n.translate('workflows.workflowSettingsFlyout.addOutput', {
              defaultMessage: 'Add output',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );

  if (fields.length === 0 && !draftField) {
    return (
      <EuiEmptyPrompt
        title={
          <h3>
            {i18n.translate('workflows.workflowSettingsFlyout.noOutputsTitle', {
              defaultMessage: 'No outputs yet',
            })}
          </h3>
        }
        titleSize="xs"
        body={
          <p>
            {i18n.translate('workflows.workflowSettingsFlyout.noOutputsBody', {
              defaultMessage:
                'Outputs are the public contract returned to calling workflows and API callers. Workflows that only act on other systems often need none.',
            })}
          </p>
        }
        actions={
          readOnly || hideInlineAddButton ? undefined : (
            <EuiButtonEmpty
              size="s"
              iconType="plusCircle"
              onClick={handleAdd}
              data-test-subj="workflowSettingsOutputAdd"
            >
              {i18n.translate('workflows.workflowSettingsFlyout.addOutput', {
                defaultMessage: 'Add output',
              })}
            </EuiButtonEmpty>
          )
        }
        data-test-subj="workflowSettingsOutputEmpty"
        css={{
          '.euiEmptyPrompt__content .euiText': {
            fontSize: '0.875rem',
          },
        }}
      />
    );
  }

  return (
    <>
      {addButton}
      {addButton ? <EuiSpacer size="s" /> : null}
      <SettingsEntryListHost
        fields={fields}
        draftRow={
          draftField ? (
            <SettingsEntryRow
              kind="output"
              mode="draft"
              field={draftField}
              siblings={fields}
              catalog={catalog}
              readOnly={readOnly}
              onCommit={commitDraft}
              onDiscard={() => setDraftField(null)}
            />
          ) : null
        }
        renderRow={(field) => (
          <SettingsEntryRow
            kind="output"
            mode="committed"
            field={field}
            siblings={fields}
            catalog={catalog}
            readOnly={readOnly}
            onChange={handleUpdate}
            onRequestDelete={() => requestDelete(field)}
          />
        )}
      />

      {pendingDelete ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.workflowSettingsFlyout.deleteOutputTitle', {
            defaultMessage: 'Delete output “{name}”?',
            values: { name: pendingDelete.field.name },
          })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => commitDelete(pendingDelete.field)}
          cancelButtonText={i18n.translate('workflows.workflowSettingsFlyout.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.workflowSettingsFlyout.delete', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <EuiText size="s">
            {pendingDelete.steps.length > 0
              ? i18n.translate('workflows.workflowSettingsFlyout.deleteOutputBodySteps', {
                  defaultMessage:
                    'This output is referenced by: {steps}. External callers that depend on this key will also break.',
                  values: { steps: pendingDelete.steps.join(', ') },
                })
              : i18n.translate('workflows.workflowSettingsFlyout.deleteOutputBodyCallers', {
                  defaultMessage:
                    'External callers that depend on this key may break after deletion.',
                })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}

      {pendingRename ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.workflowSettingsFlyout.renameOutputTitle', {
            defaultMessage: 'Rename output?',
          })}
          onCancel={() => setPendingRename(null)}
          onConfirm={() => {
            onChange(
              fields.map((f) =>
                f.id === pendingRename.field.id
                  ? { ...pendingRename.field, name: pendingRename.nextName }
                  : f
              )
            );
            setPendingRename(null);
          }}
          cancelButtonText={i18n.translate('workflows.workflowSettingsFlyout.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.workflowSettingsFlyout.rename', {
            defaultMessage: 'Rename',
          })}
          defaultFocusedButton="cancel"
        >
          <EuiText size="s">
            {i18n.translate('workflows.workflowSettingsFlyout.renameOutputBody', {
              defaultMessage:
                'Renaming “{name}” breaks external callers that read this key{stepsSuffix}.',
              values: {
                name: fields.find((f) => f.id === pendingRename.field.id)?.name ?? '',
                stepsSuffix:
                  pendingRename.steps.length > 0
                    ? i18n.translate('workflows.workflowSettingsFlyout.renameOutputStepsSuffix', {
                        defaultMessage: ', and is referenced by: {steps}',
                        values: { steps: pendingRename.steps.join(', ') },
                      })
                    : '',
              },
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </>
  );
}
