/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { ChangeEvent } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiRange,
  EuiSpacer,
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSelect,
  EuiButton,
  EuiButtonIcon,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldButton, FieldIcon } from '@kbn/react-field';

export const FIELD_TYPES = [
  { value: 'str', text: 'string' },
  { value: 'ts', text: 'date' },
  { value: 'bool', text: 'boolean' },
  { value: 'int', text: 'number' },
  { value: 'ipv4', text: 'ip' },
  { value: 'text', text: 'text' },
];

type ElementType<T extends readonly unknown[]> = T extends ReadonlyArray<
  // eslint-disable-next-line @typescript-eslint/no-shadow
  infer ElementType
>
  ? ElementType
  : never;

export interface FieldValue {
  name: string;
  type: ElementType<typeof FIELD_TYPES>;
}

const MIN_DOCUMENTS = 10000;
const MAX_DOCUMENTS = 500000;
const STEP_DOCUMENTS = 5000;
const MIN_FIELDS = 10;
const MAX_FIELDS = 500;
const STEP_FIELDS = 5;

interface Props {
  fieldValues: FieldValue[];
  updateFieldValues: (fieldValues: FieldValue[]) => void;
  nrOfDocuments: number;
  nrOfFields: number;
  onNumberOfFieldsChange: (fields: number) => void;
  onNumberOfDocumentsChange: (documents: number) => void;
}

const i18nTexts = {
  numberOfFieldsTitle: i18n.translate('homePackages.configureDatasetPanel.form.numberOfFields', {
    defaultMessage: 'Desired number of fields',
  }),
  numberOfDocumentsTitle: i18n.translate(
    'homePackages.configureDatasetPanel.form.numberOfDocuments',
    {
      defaultMessage: 'Desired number of documents',
    }
  ),
  fieldName: i18n.translate('homePackages.configureDatasetPanel.form.fieldName', {
    defaultMessage: 'Field Name',
  }),
};

export const ConfigureDatasetPanel = (props: Props) => {
  const {
    nrOfDocuments,
    nrOfFields,
    onNumberOfFieldsChange,
    onNumberOfDocumentsChange,
    fieldValues,
    updateFieldValues,
  } = props;

  const basicSelectId = useGeneratedHtmlId({ prefix: 'basicSelect' });

  const onAddFieldClick = () => {
    const updated = [
      ...fieldValues,
      {
        name: '',
        type: FIELD_TYPES[0],
      } as FieldValue,
    ];
    updateFieldValues(updated as [FieldValue]);
  };

  const onFieldDeleteClick = (index: number) => {
    const updated = [...fieldValues];
    updated.splice(index, 1);
    updateFieldValues(updated);
  };

  const onFieldTypeChange = (index: number, e: ChangeEvent<HTMLSelectElement>) => {
    const fieldValuesCpy = [...fieldValues];
    const fieldTypesIndex = FIELD_TYPES.findIndex((el) => el.value === e.target.value);
    fieldValuesCpy[index].type = FIELD_TYPES[fieldTypesIndex];
    updateFieldValues(fieldValuesCpy);
  };

  const onFieldValueChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const fieldValuesCpy = [...fieldValues];
    fieldValuesCpy[index].name = e.target.value;
    updateFieldValues(fieldValuesCpy);
  };

  const fieldToAdd = (fieldValue: FieldValue, index: number) => {
    return (
      <EuiFormRow label="Additional Fields to Add">
        <EuiFlexGroup>
          <EuiFlexItem grow={5}>
            <EuiFieldText
              placeholder="Field name"
              value={fieldValue.name}
              onChange={(e) => onFieldValueChange(index, e)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <EuiSelect
              id={basicSelectId}
              options={FIELD_TYPES}
              value={fieldValue.type.value}
              onChange={(e) => {
                onFieldTypeChange(index, e);
              }}
              aria-label="Select field type"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonIcon
              color={'danger'}
              onClick={() => onFieldDeleteClick(index)}
              iconType="trash"
              aria-label="Delete"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  };
  const fieldsToAdd = fieldValues.map((el, index) => {
    return fieldToAdd(el, index);
  });
  return (
    <EuiPanel>
      <EuiForm component="form">
        <EuiFormRow label={i18nTexts.numberOfDocumentsTitle}>
          <EuiRange
            min={MIN_DOCUMENTS}
            max={MAX_DOCUMENTS}
            step={STEP_DOCUMENTS}
            value={nrOfDocuments}
            onChange={(e) =>
              onNumberOfDocumentsChange(Number((e.target as HTMLInputElement).value))
            }
            showLabels
            showValue
          />
        </EuiFormRow>
        <EuiFormRow label={i18nTexts.numberOfFieldsTitle}>
          <EuiRange
            min={MIN_FIELDS}
            max={MAX_FIELDS}
            step={STEP_FIELDS}
            value={nrOfFields}
            onChange={(e) => onNumberOfFieldsChange(Number((e.target as HTMLInputElement).value))}
            showLabels
            showValue
          />
        </EuiFormRow>
        <EuiFormRow label="Dataset name. Cannot be changed">
          <EuiFieldText
            placeholder="kibana_sample_data_large"
            value="kibana_sample_data_large"
            disabled={true}
            readOnly={true}
          />
        </EuiFormRow>
        <EuiFormRow label="Fields to be included by default">
          <React.Fragment>
            <FieldButton
              fieldIcon={<FieldIcon type="string" label={'string'} scripted={false} />}
              fieldName={'name'}
            />
            <FieldButton
              fieldIcon={<FieldIcon type="number" label={'number'} scripted={false} />}
              fieldName={'age'}
            />
            <FieldButton
              fieldIcon={<FieldIcon type="date" label={'date'} scripted={false} />}
              fieldName={'last_updated'}
            />
            <FieldButton
              fieldIcon={<FieldIcon type="ip" label={'ip'} scripted={false} />}
              fieldName={'ipv4'}
            />
          </React.Fragment>
        </EuiFormRow>
        {fieldsToAdd}
        <EuiButton color={'primary'} fill onClick={onAddFieldClick}>
          Add another
        </EuiButton>
      </EuiForm>
      <EuiSpacer />
    </EuiPanel>
  );
};
