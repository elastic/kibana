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
  EuiBadge,
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
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  euiDragDropReorder,
  useEuiTheme,
  useGeneratedHtmlId,
  type DropResult,
  type EuiRadioGroupOption,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  applyModeChange,
  applyTypeChange,
  createEmptySchemaProperty,
  validateSchemaPropertyName,
} from './schema_property_model';
import { SchemaListDragClone } from './schema_list_drag_clone';
import {
  SCALAR_SCHEMA_PROPERTY_TYPES,
  SCHEMA_PROPERTY_MAX_DEPTH,
  SCHEMA_PROPERTY_TYPE_OPTIONS,
  type SchemaPropertyField,
  type SchemaPropertyMode,
  type SchemaPropertyType,
} from './types';

export interface SchemaPropertyListProps {
  readonly properties: readonly SchemaPropertyField[];
  readonly onChange: (next: readonly SchemaPropertyField[]) => void;
  /** Nesting depth; root list is 0. */
  readonly depth?: number;
  /** When set, used for empty-state copy (inputs vs nested properties). */
  readonly emptyTitle?: string;
  readonly emptyBody?: string;
  readonly addButtonLabel?: string;
  readonly dataTestSubjPrefix?: string;
  /**
   * Resolve step names that reference this property name (for delete/rename
   * confirms). Only needed at the root inputs list.
   */
  readonly findReferencingSteps?: (name: string) => string[];
}

const nameErrorMessage = (error: ReturnType<typeof validateSchemaPropertyName>): string | undefined => {
  if (error === 'empty') {
    return i18n.translate('workflows.schemaPropertyBuilder.nameEmpty', {
      defaultMessage: 'Name is required.',
    });
  }
  if (error === 'invalid') {
    return i18n.translate('workflows.schemaPropertyBuilder.nameInvalid', {
      defaultMessage: 'Use letters, digits, or underscore; cannot start with a digit.',
    });
  }
  if (error === 'duplicate') {
    return i18n.translate('workflows.schemaPropertyBuilder.nameDuplicate', {
      defaultMessage: 'Name must be unique among siblings.',
    });
  }
  return undefined;
};

const PropertyEditor = ({
  field,
  siblings,
  depth,
  dataTestSubjPrefix,
  onUpdate,
  onRequestDelete,
  dragHandleProps,
}: {
  readonly field: SchemaPropertyField;
  readonly siblings: readonly SchemaPropertyField[];
  readonly depth: number;
  readonly dataTestSubjPrefix: string;
  readonly onUpdate: (next: SchemaPropertyField) => void;
  readonly onRequestDelete: () => void;
  readonly dragHandleProps?: object;
}) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: `${dataTestSubjPrefix}-acc` });
  const nameError = validateSchemaPropertyName(field.name, siblings, field.id);
  const isScalar = SCALAR_SCHEMA_PROPERTY_TYPES.has(field.type);
  const atNestingLimit = depth >= SCHEMA_PROPERTY_MAX_DEPTH;
  const displayName = field.name.trim() || '—';

  const buttonContent = (
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
      {field.mode === 'required' ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('workflows.schemaPropertyBuilder.requiredBadge', {
              defaultMessage: 'Required',
            })}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );

  const typeOptions =
    depth >= SCHEMA_PROPERTY_MAX_DEPTH
      ? SCHEMA_PROPERTY_TYPE_OPTIONS.filter((o) => o.value !== 'object' && o.value !== 'array')
      : SCHEMA_PROPERTY_TYPE_OPTIONS;

  const itemTypeOptions = SCHEMA_PROPERTY_TYPE_OPTIONS.filter((o) => o.value !== 'array');

  return (
    <EuiPanel hasBorder paddingSize="none" css={{ marginBottom: euiTheme.size.s }}>
      <EuiAccordion
        id={accordionId}
        initialIsOpen
        paddingSize="m"
        buttonContent={buttonContent}
        extraAction={
          <EuiButtonIcon
            iconType="trash"
            color="danger"
            aria-label={i18n.translate('workflows.schemaPropertyBuilder.remove', {
              defaultMessage: 'Remove',
            })}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            data-test-subj={`${dataTestSubjPrefix}-remove-${field.id}`}
          />
        }
        css={{
          '.euiAccordion__triggerWrapper': {
            alignItems: 'center',
            paddingInline: euiTheme.size.m, // 16px
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
          '.euiAccordion__optionalAction': {
            paddingInlineEnd: 0,
          },
        }}
        data-test-subj={`${dataTestSubjPrefix}-row-${field.id}`}
      >
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="flexStart">
          <EuiFlexItem grow={2}>
            <EuiFormRow
              label={i18n.translate('workflows.schemaPropertyBuilder.name', {
                defaultMessage: 'Name',
              })}
              helpText={
                field.name.trim()
                  ? i18n.translate('workflows.schemaPropertyBuilder.nameHelp', {
                      defaultMessage: 'Reference as inputs.{name}',
                      values: { name: field.name.trim() },
                    })
                  : undefined
              }
              isInvalid={nameError != null && field.name.length > 0}
              error={nameErrorMessage(nameError)}
              fullWidth
              compressed
            >
              <EuiFieldText
                compressed
                fullWidth
                value={field.name}
                isInvalid={nameError != null && field.name.length > 0}
                onChange={(e) => onUpdate({ ...field, name: e.target.value })}
                data-test-subj={`${dataTestSubjPrefix}-name-${field.id}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={i18n.translate('workflows.schemaPropertyBuilder.type', {
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
                onChange={(e) =>
                  onUpdate(applyTypeChange(field, e.target.value as SchemaPropertyType))
                }
                data-test-subj={`${dataTestSubjPrefix}-type-${field.id}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('workflows.schemaPropertyBuilder.description', {
            defaultMessage: 'Description',
          })}
          fullWidth
          compressed
        >
          <EuiFieldText
            compressed
            fullWidth
            value={field.description}
            onChange={(e) => onUpdate({ ...field, description: e.target.value })}
            data-test-subj={`${dataTestSubjPrefix}-description-${field.id}`}
          />
        </EuiFormRow>

        {isScalar ? (
          <>
            <EuiSpacer size="s" />
            <EuiFormRow
              label={i18n.translate('workflows.schemaPropertyBuilder.allowedValues', {
                defaultMessage: 'Allowed values',
              })}
              helpText={i18n.translate('workflows.schemaPropertyBuilder.allowedValuesHelp', {
                defaultMessage: 'Comma-separated. Leave empty for free-form input.',
              })}
              fullWidth
              compressed
            >
              <EuiFieldText
                compressed
                fullWidth
                value={field.allowedValues.join(', ')}
                onChange={(e) =>
                  onUpdate({
                    ...field,
                    allowedValues: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                data-test-subj={`${dataTestSubjPrefix}-allowed-${field.id}`}
              />
            </EuiFormRow>
            {field.allowedValues.length > 0 ? (
              <>
                <EuiSpacer size="s" />
                <EuiFormRow fullWidth>
                  <EuiSwitch
                    label={i18n.translate('workflows.schemaPropertyBuilder.allowOther', {
                      defaultMessage: 'Allow other values',
                    })}
                    checked={field.allowOtherValues}
                    onChange={(e) =>
                      onUpdate({ ...field, allowOtherValues: e.target.checked })
                    }
                    data-test-subj={`${dataTestSubjPrefix}-allowOther-${field.id}`}
                  />
                </EuiFormRow>
              </>
            ) : null}
          </>
        ) : null}

        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('workflows.schemaPropertyBuilder.whenNoValue', {
            defaultMessage: 'When no value is provided',
          })}
          fullWidth
        >
          <EuiRadioGroup
            compressed
            name={`${dataTestSubjPrefix}-mode-${field.id}`}
            idSelected={`${field.id}-mode-${field.mode}`}
            onChange={(id) => {
              const nextMode = id.slice(`${field.id}-mode-`.length) as SchemaPropertyMode;
              onUpdate(applyModeChange(field, nextMode));
            }}
            data-test-subj={`${dataTestSubjPrefix}-mode-${field.id}`}
            options={
              [
                {
                  id: `${field.id}-mode-required`,
                  label: (
                    <span>
                      {i18n.translate('workflows.schemaPropertyBuilder.modeRequired', {
                        defaultMessage: 'Required',
                      })}
                      <EuiText size="xs" color="subdued">
                        <span>
                          {i18n.translate(
                            'workflows.schemaPropertyBuilder.modeRequiredSecondary',
                            {
                              defaultMessage: 'the caller must provide a value',
                            }
                          )}
                        </span>
                      </EuiText>
                    </span>
                  ),
                },
                {
                  id: `${field.id}-mode-default`,
                  label: (
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                      // Keep the field on the same row as the radio label.
                      css={{ flexWrap: 'nowrap' }}
                    >
                      <EuiFlexItem grow={false}>
                        {i18n.translate('workflows.schemaPropertyBuilder.modeDefault', {
                          defaultMessage: 'Use a default:',
                        })}
                      </EuiFlexItem>
                      <EuiFlexItem grow={true}>
                        <EuiFieldText
                          compressed
                          fullWidth
                          value={field.defaultValue}
                          disabled={field.mode !== 'default'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onUpdate({ ...field, defaultValue: e.target.value })
                          }
                          data-test-subj={`${dataTestSubjPrefix}-default-${field.id}`}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                },
                {
                  id: `${field.id}-mode-none`,
                  label: (
                    <span>
                      {i18n.translate('workflows.schemaPropertyBuilder.modeNone', {
                        defaultMessage: 'Leave it empty',
                      })}
                      <EuiText size="xs" color="subdued">
                        <span>
                          {i18n.translate('workflows.schemaPropertyBuilder.modeNoneSecondary', {
                            defaultMessage: 'optional, no value',
                          })}
                        </span>
                      </EuiText>
                    </span>
                  ),
                },
              ] as EuiRadioGroupOption[]
            }
          />
        </EuiFormRow>

        {field.type === 'array' ? (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate('workflows.schemaPropertyBuilder.itemType', {
                defaultMessage: 'Item type',
              })}
              fullWidth
              compressed
            >
              <EuiSelect
                compressed
                fullWidth
                options={itemTypeOptions}
                value={field.itemType ?? 'string'}
                onChange={(e) => {
                  const itemType = e.target.value as SchemaPropertyType;
                  onUpdate({
                    ...field,
                    itemType,
                    itemProperties: itemType === 'object' ? field.itemProperties ?? [] : undefined,
                  });
                }}
                data-test-subj={`${dataTestSubjPrefix}-itemType-${field.id}`}
              />
            </EuiFormRow>
            {field.itemType === 'object' ? (
              <>
                <EuiSpacer size="s" />
                {atNestingLimit ? (
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('workflows.schemaPropertyBuilder.nestingLimit', {
                      defaultMessage:
                        'Deeper nested shapes can still be edited in the YAML tab.',
                    })}
                  </EuiText>
                ) : (
                  <EuiPanel color="subdued" paddingSize="m" hasBorder={false}>
                    <SchemaPropertyList
                      properties={field.itemProperties ?? []}
                      onChange={(itemProperties) => onUpdate({ ...field, itemProperties })}
                      depth={depth + 1}
                      dataTestSubjPrefix={`${dataTestSubjPrefix}-itemProps`}
                      emptyTitle={i18n.translate(
                        'workflows.schemaPropertyBuilder.noItemPropsTitle',
                        { defaultMessage: 'No item properties yet' }
                      )}
                      emptyBody={i18n.translate(
                        'workflows.schemaPropertyBuilder.noItemPropsBody',
                        {
                          defaultMessage: 'Define the shape of each array item.',
                        }
                      )}
                      addButtonLabel={i18n.translate(
                        'workflows.schemaPropertyBuilder.addItemProperty',
                        { defaultMessage: 'Add property' }
                      )}
                    />
                  </EuiPanel>
                )}
              </>
            ) : null}
          </>
        ) : null}

        {field.type === 'object' ? (
          <>
            <EuiSpacer size="m" />
            {atNestingLimit ? (
              <EuiText size="xs" color="subdued">
                {i18n.translate('workflows.schemaPropertyBuilder.nestingLimit', {
                  defaultMessage: 'Deeper nested shapes can still be edited in the YAML tab.',
                })}
              </EuiText>
            ) : (
              <EuiPanel color="subdued" paddingSize="m" hasBorder={false}>
                <SchemaPropertyList
                  properties={field.properties ?? []}
                  onChange={(properties) => onUpdate({ ...field, properties })}
                  depth={depth + 1}
                  dataTestSubjPrefix={`${dataTestSubjPrefix}-props`}
                  emptyTitle={i18n.translate(
                    'workflows.schemaPropertyBuilder.noNestedPropsTitle',
                    { defaultMessage: 'No properties yet' }
                  )}
                  emptyBody={i18n.translate('workflows.schemaPropertyBuilder.noNestedPropsBody', {
                    defaultMessage: 'Add fields that belong on this object.',
                  })}
                  addButtonLabel={i18n.translate(
                    'workflows.schemaPropertyBuilder.addNestedProperty',
                    { defaultMessage: 'Add property' }
                  )}
                />
              </EuiPanel>
            )}
          </>
        ) : null}
      </EuiAccordion>
    </EuiPanel>
  );
};

/**
 * Reusable JSON-Schema property list editor (workflow inputs today; outputs later).
 * Must stay outside the trigger flyout so other surfaces can import it.
 */
export function SchemaPropertyList({
  properties,
  onChange,
  depth = 0,
  emptyTitle,
  emptyBody,
  addButtonLabel,
  dataTestSubjPrefix = 'schemaProperty',
  findReferencingSteps,
}: SchemaPropertyListProps) {
  const { euiTheme } = useEuiTheme();
  const droppableId = useGeneratedHtmlId({ prefix: `${dataTestSubjPrefix}-drop` });
  const [pendingDelete, setPendingDelete] = useState<{
    field: SchemaPropertyField;
    steps: string[];
  } | null>(null);
  const [pendingRename, setPendingRename] = useState<{
    field: SchemaPropertyField;
    nextName: string;
    steps: string[];
  } | null>(null);

  const resolvedEmptyTitle =
    emptyTitle ??
    i18n.translate('workflows.schemaPropertyBuilder.emptyTitle', {
      defaultMessage: 'No inputs yet',
    });
  const resolvedEmptyBody =
    emptyBody ??
    i18n.translate('workflows.schemaPropertyBuilder.emptyBody', {
      defaultMessage:
        'This workflow will run immediately when started. Add inputs for values the runner should provide — a hostname, a severity, a channel.',
    });
  const resolvedAddLabel =
    addButtonLabel ??
    i18n.translate('workflows.schemaPropertyBuilder.addInput', {
      defaultMessage: 'Add input',
    });

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!source || !destination || source.index === destination.index) return;
      onChange(euiDragDropReorder([...properties], source.index, destination.index));
    },
    [onChange, properties]
  );

  const handleAdd = useCallback(() => {
    const nextIndex = properties.length + 1;
    onChange([
      ...properties,
      createEmptySchemaProperty({
        name: depth === 0 ? `input_${nextIndex}` : `field_${nextIndex}`,
      }),
    ]);
  }, [depth, onChange, properties]);

  const commitDelete = useCallback(
    (field: SchemaPropertyField) => {
      onChange(properties.filter((p) => p.id !== field.id));
      setPendingDelete(null);
    },
    [onChange, properties]
  );

  const requestDelete = useCallback(
    (field: SchemaPropertyField) => {
      const steps = field.name.trim()
        ? findReferencingSteps?.(field.name.trim()) ?? []
        : [];
      if (steps.length > 0) {
        setPendingDelete({ field, steps });
        return;
      }
      commitDelete(field);
    },
    [commitDelete, findReferencingSteps]
  );

  const handleUpdate = useCallback(
    (next: SchemaPropertyField) => {
      const prev = properties.find((p) => p.id === next.id);
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
          // Keep previous name until confirmed — still apply other field edits.
          onChange(
            properties.map((p) =>
              p.id === next.id ? { ...next, name: prev.name } : p
            )
          );
          return;
        }
      }
      onChange(properties.map((p) => (p.id === next.id ? next : p)));
    },
    [findReferencingSteps, onChange, properties]
  );

  const list = useMemo(() => properties, [properties]);

  if (list.length === 0) {
    return (
      <EuiEmptyPrompt
        title={<h3>{resolvedEmptyTitle}</h3>}
        titleSize="xs"
        body={<p>{resolvedEmptyBody}</p>}
        actions={
          <EuiButtonEmpty
            size="s"
            iconType="plusCircle"
            onClick={handleAdd}
            data-test-subj={`${dataTestSubjPrefix}-add`}
          >
            {resolvedAddLabel}
          </EuiButtonEmpty>
        }
        data-test-subj={`${dataTestSubjPrefix}-empty`}
        css={{
          '.euiEmptyPrompt__content .euiText': {
            fontSize: euiTheme.font.scale.s * euiTheme.base,
          },
        }}
      />
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="both"
            color="primary"
            iconType="plusCircle"
            onClick={handleAdd}
            data-test-subj={`${dataTestSubjPrefix}-add`}
          >
            {resolvedAddLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiDroppable
          droppableId={droppableId}
          spacing="none"
          renderClone={(provided, _snapshot, rubric) => {
            const field = list[rubric.source.index];
            return (
              <SchemaListDragClone
                name={field?.name ?? ''}
                typeLabel={field?.type ?? 'string'}
                provided={provided}
              />
            );
          }}
        >
          {list.map((field, index) => (
            <EuiDraggable
              key={field.id}
              index={index}
              draggableId={field.id}
              spacing="none"
              customDragHandle
              hasInteractiveChildren
            >
              {(provided) => (
                <PropertyEditor
                  field={field}
                  siblings={list}
                  depth={depth}
                  dataTestSubjPrefix={dataTestSubjPrefix}
                  onUpdate={handleUpdate}
                  onRequestDelete={() => requestDelete(field)}
                  dragHandleProps={provided.dragHandleProps ?? undefined}
                />
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </EuiDragDropContext>

      {pendingDelete ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.schemaPropertyBuilder.deleteTitle', {
            defaultMessage: 'Delete input “{name}”?',
            values: { name: pendingDelete.field.name },
          })}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => commitDelete(pendingDelete.field)}
          cancelButtonText={i18n.translate('workflows.schemaPropertyBuilder.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.schemaPropertyBuilder.deleteConfirm', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
        >
          <EuiText size="s">
            {i18n.translate('workflows.schemaPropertyBuilder.deleteReferencedBody', {
              defaultMessage:
                'This input is referenced by: {steps}. Deleting it may break those steps.',
              values: { steps: pendingDelete.steps.join(', ') },
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}

      {pendingRename ? (
        <EuiConfirmModal
          title={i18n.translate('workflows.schemaPropertyBuilder.renameTitle', {
            defaultMessage: 'Rename input?',
          })}
          onCancel={() => setPendingRename(null)}
          onConfirm={() => {
            onChange(
              properties.map((p) =>
                p.id === pendingRename.field.id
                  ? { ...pendingRename.field, name: pendingRename.nextName }
                  : p
              )
            );
            setPendingRename(null);
          }}
          cancelButtonText={i18n.translate('workflows.schemaPropertyBuilder.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.schemaPropertyBuilder.renameConfirm', {
            defaultMessage: 'Rename',
          })}
          defaultFocusedButton="cancel"
        >
          <EuiText size="s">
            {i18n.translate('workflows.schemaPropertyBuilder.renameReferencedBody', {
              defaultMessage:
                '“{name}” is referenced by: {steps}. Update those steps after renaming.',
              values: {
                name: properties.find((p) => p.id === pendingRename.field.id)?.name ?? '',
                steps: pendingRename.steps.join(', '),
              },
            })}
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </>
  );
}
