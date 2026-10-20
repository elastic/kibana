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
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { settingsEntryNameErrorMessage } from './settings_entry_row_shared';
import {
  coerceConstantValue,
  type ConstantField,
  type ConstantType,
  type OutputField,
} from './workflow_settings_fields_model';
import type { DataReferenceCatalog } from '../../../features/workflow_visual_editor/lib/build_data_reference_catalog';
import {
  type SchemaPropertyField,
  validateSchemaPropertyName,
} from '../../../shared/ui/schema_property_builder';

const SettingsEntryOutputFieldsLazy = React.lazy(async () => {
  const module = await import('./settings_entry_output_fields');
  return { default: module.SettingsEntryOutputFields };
});

export type SettingsEntryKind = 'constant' | 'output';
export type SettingsEntryMode = 'committed' | 'draft';

const CONSTANT_TYPE_OPTIONS: Array<{ value: ConstantType; text: string }> = [
  { value: 'string', text: 'string' },
  { value: 'number', text: 'number' },
  { value: 'boolean', text: 'boolean' },
  { value: 'object', text: 'object' },
  { value: 'array', text: 'array' },
];

interface SettingsEntryRowSharedProps {
  readonly readOnly?: boolean;
}

export type ConstantSettingsEntryRowProps = SettingsEntryRowSharedProps & {
  readonly kind: 'constant';
  readonly field: ConstantField;
  readonly siblings: readonly ConstantField[];
};

export type OutputSettingsEntryRowProps = SettingsEntryRowSharedProps & {
  readonly kind: 'output';
  readonly field: OutputField;
  readonly siblings: readonly OutputField[];
  readonly catalog: DataReferenceCatalog;
};

export type CommittedSettingsEntryRowProps = (
  | ConstantSettingsEntryRowProps
  | OutputSettingsEntryRowProps
) & {
  readonly mode: 'committed';
  readonly onChange: (next: ConstantField | OutputField) => void;
  readonly onRequestDelete: () => void;
};

export type DraftSettingsEntryRowProps = (
  | ConstantSettingsEntryRowProps
  | OutputSettingsEntryRowProps
) & {
  readonly mode: 'draft';
  readonly onCommit: (next: ConstantField | OutputField) => void;
  readonly onDiscard: () => void;
};

export type SettingsEntryRowProps = CommittedSettingsEntryRowProps | DraftSettingsEntryRowProps;

const SummaryLine = ({
  displayName,
  typeLabel,
}: {
  readonly displayName: string;
  readonly typeLabel: string;
}) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <code>{displayName}</code>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        · {typeLabel}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const ConstantFields = ({
  field,
  siblings,
  readOnly,
  onUpdate,
}: {
  readonly field: ConstantField;
  readonly siblings: readonly ConstantField[];
  readonly readOnly?: boolean;
  readonly onUpdate: (next: ConstantField) => void;
}) => {
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

  return (
    <>
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
              options={CONSTANT_TYPE_OPTIONS}
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
    </>
  );
};

const DraftActions = ({
  kind,
  fieldId,
  readOnly,
  onCommit,
  onDiscard,
}: {
  readonly kind: SettingsEntryKind;
  readonly fieldId: string;
  readonly readOnly?: boolean;
  readonly onCommit: () => void;
  readonly onDiscard: () => void;
}) => {
  const prefix = kind === 'constant' ? 'workflowSettingsConst' : 'workflowSettingsOutput';

  if (readOnly) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButton size="xs" onClick={onDiscard} data-test-subj={`${prefix}Discard-${fieldId}`}>
          {i18n.translate('workflows.workflowSettingsFlyout.settingsEntryCancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="xs" fill onClick={onCommit} data-test-subj={`${prefix}Done-${fieldId}`}>
          {i18n.translate('workflows.workflowSettingsFlyout.settingsEntryDone', {
            defaultMessage: 'Done',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function SettingsEntryRow(props: SettingsEntryRowProps) {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({
    prefix: props.kind === 'constant' ? 'workflowConstAcc' : 'workflowOutputAcc',
  });
  const testSubjPrefix =
    props.kind === 'constant' ? 'workflowSettingsConst' : 'workflowSettingsOutput';

  const [draftField, setDraftField] = useState(props.field);
  useEffect(() => {
    setDraftField(props.field);
  }, [props.field]);

  const activeField = props.mode === 'draft' ? draftField : props.field;
  const displayName = activeField.name.trim() || '—';
  const typeLabel = activeField.type;

  const handleUpdate = useCallback(
    (next: ConstantField | OutputField) => {
      if (props.mode === 'draft') {
        setDraftField(next as typeof props.field);
        return;
      }
      props.onChange(next);
    },
    [props]
  );

  const entryFields =
    props.kind === 'constant' ? (
      <ConstantFields
        field={activeField as ConstantField}
        siblings={props.siblings as readonly ConstantField[]}
        readOnly={props.readOnly}
        onUpdate={handleUpdate}
      />
    ) : (
      <Suspense fallback={null}>
        <SettingsEntryOutputFieldsLazy
          field={activeField as OutputField}
          siblings={props.siblings as readonly OutputField[]}
          catalog={props.catalog}
          readOnly={props.readOnly}
          onUpdate={handleUpdate}
        />
      </Suspense>
    );

  if (props.mode === 'draft') {
    return (
      <EuiPanel
        hasBorder
        paddingSize="m"
        css={{ marginBottom: euiTheme.size.s }}
        data-test-subj={`${testSubjPrefix}Row-${props.field.id}`}
      >
        <SummaryLine displayName={displayName} typeLabel={typeLabel} />
        <EuiSpacer size="m" />
        {entryFields}
        <EuiSpacer size="m" />
        <DraftActions
          kind={props.kind}
          fieldId={props.field.id}
          readOnly={props.readOnly}
          onCommit={() => props.onCommit(draftField)}
          onDiscard={props.onDiscard}
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="none" css={{ marginBottom: euiTheme.size.s }}>
      <EuiAccordion
        id={accordionId}
        initialIsOpen={false}
        paddingSize="m"
        buttonContent={<SummaryLine displayName={displayName} typeLabel={typeLabel} />}
        extraAction={
          props.readOnly ? undefined : (
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={
                props.kind === 'constant'
                  ? i18n.translate('workflows.workflowSettingsFlyout.removeConstant', {
                      defaultMessage: 'Remove constant',
                    })
                  : i18n.translate('workflows.workflowSettingsFlyout.removeOutput', {
                      defaultMessage: 'Remove output',
                    })
              }
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                props.onRequestDelete();
              }}
              data-test-subj={`${testSubjPrefix}Remove-${props.field.id}`}
            />
          )
        }
        css={{
          '.euiAccordion__triggerWrapper': {
            alignItems: 'center',
            paddingInline: euiTheme.size.m,
          },
          '.euiAccordion__button': {
            paddingInline: 0,
            paddingBlock: euiTheme.size.s,
          },
        }}
        data-test-subj={`${testSubjPrefix}Row-${props.field.id}`}
      >
        {entryFields}
      </EuiAccordion>
    </EuiPanel>
  );
}

export interface SettingsEntryListHostProps<T extends { readonly id: string }> {
  readonly fields: readonly T[];
  readonly renderRow: (field: T) => React.ReactElement;
  readonly draftRow?: React.ReactElement | null;
}

export function SettingsEntryListHost<T extends { readonly id: string }>({
  fields,
  renderRow,
  draftRow,
}: SettingsEntryListHostProps<T>) {
  return (
    <>
      {fields.map((field) => (
        <React.Fragment key={field.id}>{renderRow(field)}</React.Fragment>
      ))}
      {draftRow}
    </>
  );
}
