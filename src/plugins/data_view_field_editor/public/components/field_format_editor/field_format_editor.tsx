/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';
import { EuiCode, EuiFormRow, EuiSelect } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES, ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { FieldFormatInstanceType } from '@kbn/field-formats-plugin/common';
import { CoreStart } from '@kbn/core/public';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { FormatEditor } from './format_editor';
import { FormatEditorServiceStart } from '../../service';
import { FieldFormatConfig } from '../../types';

export interface FormatSelectEditorProps {
  esTypes: ES_FIELD_TYPES[];
  indexPattern: DataView;
  fieldFormatEditors: FormatEditorServiceStart['fieldFormatEditors'];
  fieldFormats: FieldFormatsStart;
  uiSettings: CoreStart['uiSettings'];
  onChange: (change?: FieldFormatConfig) => void;
  onError: (error?: string) => void;
  value?: FieldFormatConfig;
}

interface FieldTypeFormat {
  id: string;
  title: string;
}

export interface FormatSelectEditorState {
  fieldTypeFormats: FieldTypeFormat[];
  fieldFormatId?: string;
  fieldFormatParams?: { [key: string]: unknown };
  kbnType: KBN_FIELD_TYPES;
}

interface InitialFieldTypeFormat extends FieldTypeFormat {
  defaultFieldFormat: FieldFormatInstanceType;
}

const getFieldTypeFormatsList = (
  fieldType: KBN_FIELD_TYPES,
  defaultFieldFormat: FieldFormatInstanceType,
  fieldFormats: FieldFormatsStart
) => {
  const formatsByType = fieldFormats.getByFieldType(fieldType).map(({ id, title }) => ({
    id,
    title,
  }));

  return [
    {
      id: '',
      defaultFieldFormat,
      title: i18n.translate('indexPatternFieldEditor.defaultFormatDropDown', {
        defaultMessage: '- Default -',
      }),
    },
    ...formatsByType,
  ];
};

export class FormatSelectEditor extends PureComponent<
  FormatSelectEditorProps,
  FormatSelectEditorState
> {
  constructor(props: FormatSelectEditorProps) {
    super(props);
    const { fieldFormats, esTypes } = props;
    const kbnType = castEsToKbnFieldTypeName(esTypes[0] || 'keyword');

    this.state = {
      fieldTypeFormats: getFieldTypeFormatsList(
        kbnType,
        fieldFormats.getDefaultType(kbnType, esTypes) as FieldFormatInstanceType,
        fieldFormats
      ),
      kbnType,
    };
  }
  onFormatChange = (formatId: string, params?: any) =>
    this.props.onChange(
      formatId
        ? {
            id: formatId,
            params: params || {},
          }
        : undefined
    );

  onFormatParamsChange = (newParams: { [key: string]: any }) => {
    const { fieldFormatId } = this.state;
    this.onFormatChange(fieldFormatId as string, newParams);
  };

  render() {
    const { fieldFormatEditors, onError, value, fieldFormats, esTypes } = this.props;
    const fieldFormatId = value?.id;
    const { kbnType } = this.state;

    const { fieldTypeFormats } = this.state;

    const defaultFormat = (fieldTypeFormats[0] as InitialFieldTypeFormat).defaultFieldFormat.title;

    // get current formatter for field, provides default if none exists
    const format = value?.id
      ? fieldFormats.getInstance(value?.id, value?.params)
      : fieldFormats.getDefaultInstance(kbnType, esTypes);

    const fieldFormatParams = format.params();

    const label = defaultFormat ? (
      <FormattedMessage
        id="indexPatternFieldEditor.defaultFormatHeader"
        defaultMessage="Format (Default: {defaultFormat})"
        values={{
          defaultFormat: <EuiCode>{defaultFormat}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage id="indexPatternFieldEditor.formatHeader" defaultMessage="Format" />
    );
    return (
      <>
        <EuiFormRow label={label}>
          <EuiSelect
            value={fieldFormatId || ''}
            options={fieldTypeFormats.map((fmt) => {
              return { value: fmt.id || '', text: fmt.title };
            })}
            data-test-subj="editorSelectedFormatId"
            onChange={(e) => {
              this.onFormatChange(e.target.value);
            }}
          />
        </EuiFormRow>
        {fieldFormatId ? (
          <FormatEditor
            fieldType={kbnType}
            fieldFormat={format}
            fieldFormatId={fieldFormatId}
            fieldFormatParams={fieldFormatParams}
            fieldFormatEditors={fieldFormatEditors}
            onChange={(params) => {
              this.onFormatChange(fieldFormatId, params);
            }}
            onError={onError}
          />
        ) : null}
      </>
    );
  }
}
