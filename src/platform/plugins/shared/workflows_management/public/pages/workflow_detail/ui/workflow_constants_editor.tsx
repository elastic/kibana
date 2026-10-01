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
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  SettingsEntryListHost,
  SettingsEntryRow,
} from './settings_entry_row';
import {
  createEmptyConstant,
  type ConstantField,
} from './workflow_settings_fields_model';

export interface SettingsEditorAddControls {
  readonly onAdd: () => void;
  readonly disabled: boolean;
}

export interface WorkflowConstantsEditorProps {
  readonly fields: readonly ConstantField[];
  readonly onChange: (next: readonly ConstantField[]) => void;
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

export function WorkflowConstantsEditor({
  fields,
  onChange,
  findReferencingSteps,
  readOnly = false,
  discardDraftSignal,
  hideInlineAddButton = false,
  onAddControlsChange,
}: WorkflowConstantsEditorProps) {
  const [draftField, setDraftField] = useState<ConstantField | null>(null);

  useEffect(() => {
    if (discardDraftSignal === undefined) return;
    setDraftField(null);
  }, [discardDraftSignal]);
  const [pendingDelete, setPendingDelete] = useState<{
    field: ConstantField;
    steps: string[];
  } | null>(null);
  const [pendingRename, setPendingRename] = useState<{
    field: ConstantField;
    nextName: string;
    steps: string[];
  } | null>(null);

  const handleAdd = useCallback(() => {
    if (draftField || readOnly) return;
    const nextIndex = fields.length + 1;
    setDraftField(createEmptyConstant({ name: `constant_${nextIndex}` }));
  }, [draftField, fields.length, readOnly]);

  useEffect(() => {
    if (!onAddControlsChange) return undefined;
    onAddControlsChange(
      readOnly ? null : { onAdd: handleAdd, disabled: draftField != null }
    );
    return () => onAddControlsChange(null);
  }, [onAddControlsChange, readOnly, handleAdd, draftField]);

  const commitDelete = useCallback(
    (field: ConstantField) => {
      onChange(fields.filter((f) => f.id !== field.id));
      setPendingDelete(null);
    },
    [fields, onChange]
  );

  const requestDelete = useCallback(
    (field: ConstantField) => {
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
    (next: ConstantField) => {
      const prev = fields.find((f) => f.id === next.id);
      if (
        prev &&
        prev.name.trim() &&
        next.name.trim() &&
        prev.name.trim() !== next.name.trim() &&
        findReferencingSteps
      ) {
        const steps = findReferencingSteps(prev.name.trim());
        if (steps.length > 0) {
          setPendingRename({ field: next, nextName: next.name, steps });
          onChange(fields.map((f) => (f.id === next.id ? { ...next, name: prev.name } : f)));
          return;
        }
      }
      onChange(fields.map((f) => (f.id === next.id ? next : f)));
    },
    [fields, findReferencingSteps, onChange]
  );

  const commitDraft = useCallback(
    (next: ConstantField) => {
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
            data-test-subj="workflowSettingsConstAdd"
          >
            {i18n.translate('workflows.workflowSettingsFlyout.addConstant', {
              defaultMessage: 'Add constant',
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
            {i18n.translate('workflows.workflowSettingsFlyout.noConstantsTitle', {
              defaultMessage: 'No constants yet',
            })}
          </h3>
        }
        titleSize="xs"
        body={
          <p>
            {i18n.translate('workflows.workflowSettingsFlyout.noConstantsBody', {
              defaultMessage:
                'Constants are fixed values reused across steps — a channel name, an API base URL, a case owner. They are stored in the workflow definition and visible to anyone who can edit it. Reference them as consts.<name>.',
            })}
          </p>
        }
        actions={
          readOnly || hideInlineAddButton ? undefined : (
            <EuiButtonEmpty
              size="s"
              iconType="plusCircle"
              onClick={handleAdd}
              data-test-subj="workflowSettingsConstAdd"
            >
              {i18n.translate('workflows.workflowSettingsFlyout.addConstant', {
                defaultMessage: 'Add constant',
              })}
            </EuiButtonEmpty>
          )
        }
        data-test-subj="workflowSettingsConstEmpty"
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
              kind="constant"
              mode="draft"
              field={draftField}
              siblings={fields}
              readOnly={readOnly}
              onCommit={commitDraft}
              onDiscard={() => setDraftField(null)}
            />
          ) : null
        }
        renderRow={(field) => (
          <SettingsEntryRow
            kind="constant"
            mode="committed"
            field={field}
            siblings={fields}
            readOnly={readOnly}
            onChange={handleUpdate}
            onRequestDelete={() => requestDelete(field)}
          />
        )}
      />

      {pendingDelete ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.workflowSettingsFlyout.deleteConstTitle', {
            defaultMessage: 'Delete constant “{name}”?',
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
            {i18n.translate('workflows.workflowSettingsFlyout.deleteConstBody', {
              defaultMessage:
                'This constant is referenced by: {steps}. Deleting it may break those steps.',
              values: { steps: pendingDelete.steps.join(', ') },
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}

      {pendingRename ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.workflowSettingsFlyout.renameConstTitle', {
            defaultMessage: 'Rename constant?',
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
            {i18n.translate('workflows.workflowSettingsFlyout.renameConstBody', {
              defaultMessage:
                '“{name}” is referenced by: {steps}. Update those steps after renaming.',
              values: {
                name: fields.find((f) => f.id === pendingRename.field.id)?.name ?? '',
                steps: pendingRename.steps.join(', '),
              },
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </>
  );
}
