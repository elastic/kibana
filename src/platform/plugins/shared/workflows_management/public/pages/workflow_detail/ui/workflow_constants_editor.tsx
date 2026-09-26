/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  euiDragDropReorder,
  useEuiTheme,
  useGeneratedHtmlId,
  type DropResult,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  SchemaListDragClone,
  validateSchemaPropertyName,
  type SchemaPropertyField,
} from '../../../shared/ui/schema_property_builder';
import {
  coerceConstantValue,
  createEmptyConstant,
  type ConstantField,
  type ConstantType,
} from './workflow_settings_fields_model';

const TYPE_OPTIONS: Array<{ value: ConstantType; text: string }> = [
  { value: 'string', text: 'string' },
  { value: 'number', text: 'number' },
  { value: 'boolean', text: 'boolean' },
  { value: 'object', text: 'object' },
  { value: 'array', text: 'array' },
];

export interface WorkflowConstantsEditorProps {
  readonly fields: readonly ConstantField[];
  readonly onChange: (next: readonly ConstantField[]) => void;
  readonly findReferencingSteps?: (name: string) => string[];
  readonly readOnly?: boolean;
}

const ConstantCard = ({
  field,
  siblings,
  onUpdate,
  onRequestDelete,
  dragHandleProps,
  readOnly,
}: {
  readonly field: ConstantField;
  readonly siblings: readonly ConstantField[];
  readonly onUpdate: (next: ConstantField) => void;
  readonly onRequestDelete: () => void;
  readonly dragHandleProps?: object;
  readonly readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'workflowConstAcc' });
  const nameError = validateSchemaPropertyName(
    field.name,
    siblings as unknown as SchemaPropertyField[],
    field.id
  );
  const coerced = coerceConstantValue(field.type, field.value);
  const valueError =
    coerced.ok === false
      ? coerced.error === 'expression'
        ? i18n.translate('workflows.workflowSettingsFlyout.constExpressionError', {
            defaultMessage:
              'Constants cannot use {braces} expressions — they are fixed for every run.',
            values: { braces: '{{ }}' },
          })
        : i18n.translate('workflows.workflowSettingsFlyout.constValueError', {
            defaultMessage: 'Enter a valid {type} value.',
            values: { type: field.type },
          })
      : undefined;
  const displayName = field.name.trim() || '—';

  return (
    <EuiPanel hasBorder paddingSize="none" css={{ marginBottom: euiTheme.size.s }}>
      <EuiAccordion
        id={accordionId}
        initialIsOpen
        paddingSize="m"
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                {...dragHandleProps}
                data-drag-grip
                css={{
                  cursor: 'grab',
                  display: 'inline-flex',
                  alignItems: 'center',
                  // Collapsed until the accordion trigger is hovered / focused —
                  // same reveal as the expression-builder catalog rows.
                  width: 0,
                  minWidth: 0,
                  opacity: 0,
                  overflow: 'hidden',
                  marginInlineEnd: 0,
                  transition: 'width 140ms ease, opacity 140ms ease, margin 140ms ease',
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                }}
              >
                <EuiIcon type="drag" color="subdued" size="s" />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <code>{displayName}</code>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                · {field.type}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          readOnly ? undefined : (
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={i18n.translate('workflows.workflowSettingsFlyout.removeConstant', {
                defaultMessage: 'Remove constant',
              })}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRequestDelete();
              }}
              data-test-subj={`workflowSettingsConstRemove-${field.id}`}
            />
          )
        }
        css={{
          '.euiAccordion__triggerWrapper': {
            alignItems: 'center',
            paddingInline: euiTheme.size.m,
            '&:hover [data-drag-grip], &:focus-within [data-drag-grip]': {
              width: 16,
              minWidth: 16,
              opacity: 1,
              marginInlineEnd: 6,
            },
          },
          '.euiAccordion__button': {
            paddingInline: 0,
            paddingBlock: euiTheme.size.s,
          },
        }}
        data-test-subj={`workflowSettingsConstRow-${field.id}`}
      >
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="flexStart">
          <EuiFlexItem grow={2}>
            <EuiFormRow
              label={i18n.translate('workflows.workflowSettingsFlyout.constName', {
                defaultMessage: 'Name',
              })}
              helpText={
                field.name.trim()
                  ? i18n.translate('workflows.workflowSettingsFlyout.constNameHelp', {
                      defaultMessage: 'Reference as consts.{name}',
                      values: { name: field.name.trim() },
                    })
                  : undefined
              }
              isInvalid={nameError != null && field.name.length > 0}
              error={
                nameError === 'empty'
                  ? i18n.translate('workflows.schemaPropertyBuilder.nameEmpty', {
                      defaultMessage: 'Name is required.',
                    })
                  : nameError === 'invalid'
                    ? i18n.translate('workflows.schemaPropertyBuilder.nameInvalid', {
                        defaultMessage:
                          'Use letters, digits, or underscore; cannot start with a digit.',
                      })
                    : nameError === 'duplicate'
                      ? i18n.translate('workflows.schemaPropertyBuilder.nameDuplicate', {
                          defaultMessage: 'Name must be unique among siblings.',
                        })
                      : undefined
              }
              fullWidth
              compressed
            >
              <EuiFieldText
                compressed
                fullWidth
                value={field.name}
                disabled={readOnly}
                onChange={(e) => onUpdate({ ...field, name: e.target.value })}
                data-test-subj={`workflowSettingsConstName-${field.id}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={i18n.translate('workflows.workflowSettingsFlyout.constType', {
                defaultMessage: 'Type',
              })}
              fullWidth
              compressed
            >
              <EuiSelect
                compressed
                fullWidth
                options={TYPE_OPTIONS}
                value={field.type}
                disabled={readOnly}
                onChange={(e) =>
                  onUpdate({
                    ...field,
                    type: e.target.value as ConstantType,
                    value: '',
                  })
                }
                data-test-subj={`workflowSettingsConstType-${field.id}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('workflows.workflowSettingsFlyout.constValue', {
            defaultMessage: 'Value',
          })}
          helpText={i18n.translate('workflows.workflowSettingsFlyout.constValueHelp', {
            defaultMessage:
              "Constants don't accept {braces} expressions — they're the same on every run.",
            values: { braces: '{{ }}' },
          })}
          isInvalid={Boolean(valueError)}
          error={valueError}
          fullWidth
          compressed
        >
          {field.type === 'object' || field.type === 'array' ? (
            <EuiTextArea
              compressed
              fullWidth
              rows={4}
              value={field.value}
              disabled={readOnly}
              onChange={(e) => onUpdate({ ...field, value: e.target.value })}
              data-test-subj={`workflowSettingsConstValue-${field.id}`}
            />
          ) : (
            <EuiFieldText
              compressed
              fullWidth
              value={field.value}
              disabled={readOnly}
              onChange={(e) => onUpdate({ ...field, value: e.target.value })}
              data-test-subj={`workflowSettingsConstValue-${field.id}`}
            />
          )}
        </EuiFormRow>
      </EuiAccordion>
    </EuiPanel>
  );
};

export function WorkflowConstantsEditor({
  fields,
  onChange,
  findReferencingSteps,
  readOnly = false,
}: WorkflowConstantsEditorProps) {
  const droppableId = useGeneratedHtmlId({ prefix: 'workflowConstsDrop' });
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
    const nextIndex = fields.length + 1;
    onChange([...fields, createEmptyConstant({ name: `constant_${nextIndex}` })]);
  }, [fields, onChange]);

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!source || !destination || source.index === destination.index) return;
      onChange(euiDragDropReorder([...fields], source.index, destination.index));
    },
    [fields, onChange]
  );

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

  if (fields.length === 0) {
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
          readOnly ? undefined : (
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
      {!readOnly ? (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="both"
              color="primary"
              iconType="plusCircle"
              onClick={handleAdd}
              data-test-subj="workflowSettingsConstAdd"
            >
              {i18n.translate('workflows.workflowSettingsFlyout.addConstant', {
                defaultMessage: 'Add constant',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiSpacer size="s" />
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable
          droppableId={droppableId}
          spacing="none"
          renderClone={(provided, _snapshot, rubric) => {
            const field = fields[rubric.source.index];
            return (
              <SchemaListDragClone
                name={field?.name ?? ''}
                typeLabel={field?.type ?? 'string'}
                provided={provided}
              />
            );
          }}
        >
          {fields.map((field, index) => (
            <EuiDraggable
              key={field.id}
              index={index}
              draggableId={field.id}
              spacing="none"
              customDragHandle
              hasInteractiveChildren
              isDragDisabled={readOnly}
            >
              {(provided) => (
                <ConstantCard
                  field={field}
                  siblings={fields}
                  onUpdate={handleUpdate}
                  onRequestDelete={() => requestDelete(field)}
                  dragHandleProps={provided.dragHandleProps ?? undefined}
                  readOnly={readOnly}
                />
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>

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
