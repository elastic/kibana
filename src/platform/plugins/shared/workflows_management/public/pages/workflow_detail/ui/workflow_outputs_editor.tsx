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
  euiDragDropReorder,
  useEuiTheme,
  useGeneratedHtmlId,
  type DropResult,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { ConnectorContractUnion, WorkflowYaml } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  SchemaPropertyList,
  SCHEMA_PROPERTY_TYPE_OPTIONS,
  SchemaListDragClone,
  validateSchemaPropertyName,
  type SchemaPropertyField,
  type SchemaPropertyType,
} from '../../../shared/ui/schema_property_builder';
import { buildDataReferenceCatalog } from '../../../features/workflow_visual_editor/lib/build_data_reference_catalog';
import { ReferenceCapableField } from '../../../features/workflow_visual_editor/ui/reference_capable_field';
import { createEmptyOutput, type OutputField } from './workflow_settings_fields_model';

export interface WorkflowOutputsEditorProps {
  readonly fields: readonly OutputField[];
  readonly onChange: (next: readonly OutputField[]) => void;
  readonly workflowDefinition: WorkflowYaml | undefined;
  readonly connectors: readonly ConnectorContractUnion[];
  readonly findReferencingSteps?: (name: string) => string[];
  readonly readOnly?: boolean;
}

const OutputCard = ({
  field,
  siblings,
  catalog,
  onUpdate,
  onRequestDelete,
  dragHandleProps,
  readOnly,
}: {
  readonly field: OutputField;
  readonly siblings: readonly OutputField[];
  readonly catalog: ReturnType<typeof buildDataReferenceCatalog>;
  readonly onUpdate: (next: OutputField) => void;
  readonly onRequestDelete: () => void;
  readonly dragHandleProps?: object;
  readonly readOnly?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'workflowOutputAcc' });
  const nameError = validateSchemaPropertyName(
    field.name,
    siblings as unknown as SchemaPropertyField[],
    field.id
  );
  const displayName = field.name.trim() || '—';
  const typeOptions = SCHEMA_PROPERTY_TYPE_OPTIONS;

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
              aria-label={i18n.translate('workflows.workflowSettingsFlyout.removeOutput', {
                defaultMessage: 'Remove output',
              })}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onRequestDelete();
              }}
              data-test-subj={`workflowSettingsOutputRemove-${field.id}`}
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
        data-test-subj={`workflowSettingsOutputRow-${field.id}`}
      >
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="flexStart">
          <EuiFlexItem grow={2}>
            <EuiFormRow
              label={i18n.translate('workflows.workflowSettingsFlyout.outputName', {
                defaultMessage: 'Name',
              })}
              helpText={
                field.name.trim()
                  ? i18n.translate('workflows.workflowSettingsFlyout.outputNameHelp', {
                      defaultMessage: 'Caller-facing key: outputs.{name}',
                      values: { name: field.name.trim() },
                    })
                  : undefined
              }
              isInvalid={nameError != null && field.name.length > 0}
              error={
                nameError === 'duplicate'
                  ? i18n.translate('workflows.schemaPropertyBuilder.nameDuplicate', {
                      defaultMessage: 'Name must be unique among siblings.',
                    })
                  : nameError === 'invalid'
                    ? i18n.translate('workflows.schemaPropertyBuilder.nameInvalid', {
                        defaultMessage:
                          'Use letters, digits, or underscore; cannot start with a digit.',
                      })
                    : nameError === 'empty'
                      ? i18n.translate('workflows.schemaPropertyBuilder.nameEmpty', {
                          defaultMessage: 'Name is required.',
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
                data-test-subj={`workflowSettingsOutputName-${field.id}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={i18n.translate('workflows.workflowSettingsFlyout.outputType', {
                defaultMessage: 'Type',
              })}
              fullWidth
              compressed
            >
              <EuiSelect
                compressed
                fullWidth
                options={typeOptions}
                value={field.type}
                disabled={readOnly}
                onChange={(e) => {
                  const type = e.target.value as SchemaPropertyType;
                  onUpdate({
                    ...field,
                    type,
                    properties: type === 'object' ? field.properties ?? [] : undefined,
                    itemType: type === 'array' ? field.itemType ?? 'string' : undefined,
                    itemProperties:
                      type === 'array' && (field.itemType ?? 'string') === 'object'
                        ? field.itemProperties ?? []
                        : undefined,
                  });
                }}
                data-test-subj={`workflowSettingsOutputType-${field.id}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('workflows.workflowSettingsFlyout.outputValue', {
            defaultMessage: 'Value',
          })}
          helpText={i18n.translate('workflows.workflowSettingsFlyout.outputValueHelp', {
            defaultMessage: 'Expression evaluated when the workflow finishes.',
          })}
          fullWidth
          compressed
        >
          <ReferenceCapableField
            catalog={catalog}
            value={field.value}
            onChange={(next) => onUpdate({ ...field, value: next })}
            data-test-subj={`workflowSettingsOutputValueRef-${field.id}`}
          >
            {(bind) => (
              <EuiFieldText
                compressed
                fullWidth
                value={bind.value}
                disabled={readOnly}
                placeholder={bind.teachingPlaceholder}
                inputRef={bind.attachInputRef}
                append={bind.appendControls}
                onChange={(e) => {
                  const el = e.target;
                  bind.reportChange(el.value, el.selectionStart ?? el.value.length);
                }}
                data-test-subj={`workflowSettingsOutputValue-${field.id}`}
              />
            )}
          </ReferenceCapableField>
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('workflows.workflowSettingsFlyout.outputFallback', {
            defaultMessage: 'Fallback',
          })}
          helpText={i18n.translate('workflows.workflowSettingsFlyout.outputFallbackHelp', {
            defaultMessage:
              'Used when the expression resolves to nothing — for example a branch that did not run. Keeps the declared contract intact for callers.',
          })}
          fullWidth
          compressed
        >
          <EuiFieldText
            compressed
            fullWidth
            value={field.fallback}
            disabled={readOnly}
            onChange={(e) => onUpdate({ ...field, fallback: e.target.value })}
            data-test-subj={`workflowSettingsOutputFallback-${field.id}`}
          />
        </EuiFormRow>

        {field.type === 'object' ? (
          <>
            <EuiSpacer size="m" />
            <EuiPanel color="subdued" paddingSize="m" hasBorder={false}>
              <SchemaPropertyList
                properties={field.properties ?? []}
                onChange={(properties) => onUpdate({ ...field, properties })}
                depth={1}
                dataTestSubjPrefix={`workflowSettingsOutputProps-${field.id}`}
                emptyTitle={i18n.translate('workflows.workflowSettingsFlyout.noOutputPropsTitle', {
                  defaultMessage: 'No properties yet',
                })}
                emptyBody={i18n.translate('workflows.workflowSettingsFlyout.noOutputPropsBody', {
                  defaultMessage: 'Add fields that belong on this output object.',
                })}
                addButtonLabel={i18n.translate(
                  'workflows.workflowSettingsFlyout.addOutputProperty',
                  { defaultMessage: 'Add property' }
                )}
              />
            </EuiPanel>
          </>
        ) : null}

        {field.type === 'array' ? (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('workflows.workflowSettingsFlyout.outputItemType', {
                defaultMessage: 'Item type',
              })}
              fullWidth
              compressed
            >
              <EuiSelect
                compressed
                fullWidth
                options={SCHEMA_PROPERTY_TYPE_OPTIONS.filter((o) => o.value !== 'array')}
                value={field.itemType ?? 'string'}
                disabled={readOnly}
                onChange={(e) => {
                  const itemType = e.target.value as SchemaPropertyType;
                  onUpdate({
                    ...field,
                    itemType,
                    itemProperties: itemType === 'object' ? field.itemProperties ?? [] : undefined,
                  });
                }}
                data-test-subj={`workflowSettingsOutputItemType-${field.id}`}
              />
            </EuiFormRow>
            {field.itemType === 'object' ? (
              <>
                <EuiSpacer size="s" />
                <EuiPanel color="subdued" paddingSize="m" hasBorder={false}>
                  <SchemaPropertyList
                    properties={field.itemProperties ?? []}
                    onChange={(itemProperties) => onUpdate({ ...field, itemProperties })}
                    depth={1}
                    dataTestSubjPrefix={`workflowSettingsOutputItemProps-${field.id}`}
                    emptyTitle={i18n.translate(
                      'workflows.workflowSettingsFlyout.noOutputItemPropsTitle',
                      { defaultMessage: 'No item properties yet' }
                    )}
                    emptyBody={i18n.translate(
                      'workflows.workflowSettingsFlyout.noOutputItemPropsBody',
                      { defaultMessage: 'Define the shape of each array item.' }
                    )}
                    addButtonLabel={i18n.translate(
                      'workflows.workflowSettingsFlyout.addOutputItemProperty',
                      { defaultMessage: 'Add property' }
                    )}
                  />
                </EuiPanel>
              </>
            ) : null}
          </>
        ) : null}
      </EuiAccordion>
    </EuiPanel>
  );
};

export function WorkflowOutputsEditor({
  fields,
  onChange,
  workflowDefinition,
  connectors,
  findReferencingSteps,
  readOnly = false,
}: WorkflowOutputsEditorProps) {
  const droppableId = useGeneratedHtmlId({ prefix: 'workflowOutputsDrop' });
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
    const nextIndex = fields.length + 1;
    onChange([...fields, createEmptyOutput({ name: `output_${nextIndex}` })]);
  }, [fields, onChange]);

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!source || !destination || source.index === destination.index) return;
      onChange(euiDragDropReorder([...fields], source.index, destination.index));
    },
    [fields, onChange]
  );

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
        // Always warn on rename — external callers may depend on the key.
        setPendingRename({ field: next, nextName: next.name, steps });
        onChange(fields.map((f) => (f.id === next.id ? { ...next, name: prev.name } : f)));
        return;
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
          readOnly ? undefined : (
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
      {!readOnly ? (
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="both"
              color="primary"
              iconType="plusCircle"
              onClick={handleAdd}
              data-test-subj="workflowSettingsOutputAdd"
            >
              {i18n.translate('workflows.workflowSettingsFlyout.addOutput', {
                defaultMessage: 'Add output',
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
                <OutputCard
                  field={field}
                  siblings={fields}
                  catalog={catalog}
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
