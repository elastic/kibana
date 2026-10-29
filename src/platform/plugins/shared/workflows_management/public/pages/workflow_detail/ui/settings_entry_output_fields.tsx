/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { settingsEntryNameErrorMessage } from './settings_entry_row_shared';
import type { OutputField } from './workflow_settings_fields_model';
import type { DataReferenceCatalog } from '../../../features/workflow_visual_editor/lib/build_data_reference_catalog';
import { ReferenceCapableField } from '../../../features/workflow_visual_editor/ui/reference_capable_field';
import {
  SCHEMA_PROPERTY_TYPE_OPTIONS,
  type SchemaPropertyField,
  SchemaPropertyList,
  type SchemaPropertyType,
  validateSchemaPropertyName,
} from '../../../shared/ui/schema_property_builder';

export const SETTINGS_ENTRY_OUTPUT_TYPE_OPTIONS = SCHEMA_PROPERTY_TYPE_OPTIONS.filter(
  (option) => option.value !== 'date'
);

export const SettingsEntryOutputFields = ({
  field,
  siblings,
  catalog,
  readOnly,
  onUpdate,
}: {
  readonly field: OutputField;
  readonly siblings: readonly OutputField[];
  readonly catalog: DataReferenceCatalog;
  readonly readOnly?: boolean;
  readonly onUpdate: (next: OutputField) => void;
}) => {
  const nameError = validateSchemaPropertyName(
    field.name,
    siblings as unknown as SchemaPropertyField[],
    field.id
  );

  return (
    <>
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
            error={settingsEntryNameErrorMessage(nameError)}
            fullWidth
            compressed
          >
            <EuiFieldText
              isInvalid={nameError != null && field.name.length > 0}
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
              options={SETTINGS_ENTRY_OUTPUT_TYPE_OPTIONS}
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
              addButtonLabel={i18n.translate('workflows.workflowSettingsFlyout.addOutputProperty', {
                defaultMessage: 'Add property',
              })}
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
              options={SETTINGS_ENTRY_OUTPUT_TYPE_OPTIONS.filter((o) => o.value !== 'array')}
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
    </>
  );
};
