/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent } from 'react';
import { EuiCode, EuiFormRow, EuiSelect } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  IndexPatternField,
  FieldFormatInstanceType,
  IndexPattern,
  KBN_FIELD_TYPES,
  ES_FIELD_TYPES,
  DataPublicPluginStart,
  FieldFormat,
} from 'src/plugins/data/public';
import { CoreStart } from 'src/core/public';
import { FormatEditor } from './format_editor';
import { FormatEditorServiceStart } from '../../service';

export interface FormatSelectEditorProps {
  spec: IndexPatternField['spec'];
  indexPattern: IndexPattern;
  fieldFormatEditors: FormatEditorServiceStart['fieldFormatEditors'];
  fieldFormats: DataPublicPluginStart['fieldFormats'];
  uiSettings: CoreStart['uiSettings'];
  onChange: (change: { id: string; params: { [key: string]: any } } | undefined) => void;
  onError: (error?: string) => void;
}

interface FieldTypeFormat {
  id: string;
  title: string;
}

export interface FormatSelectEditorState {
  fieldTypeFormats: FieldTypeFormat[];
  fieldFormatId?: string;
  fieldFormatParams: { [key: string]: unknown };
  format: FieldFormat;
}

interface InitialFieldTypeFormat extends FieldTypeFormat {
  defaultFieldFormat: FieldFormatInstanceType;
}

const getFieldTypeFormatsList = (
  field: IndexPatternField['spec'],
  defaultFieldFormat: FieldFormatInstanceType,
  fieldFormats: DataPublicPluginStart['fieldFormats']
) => {
  const formatsByType = fieldFormats
    .getByFieldType(field.type as KBN_FIELD_TYPES)
    .map(({ id, title }) => ({
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
    const { spec, indexPattern, fieldFormats } = props;

    const format = indexPattern.getFormatterForField(spec);
    const DefaultFieldFormat = fieldFormats.getDefaultType(
      spec.type as KBN_FIELD_TYPES,
      spec.esTypes as ES_FIELD_TYPES[]
    );
    this.state = {
      fieldTypeFormats: getFieldTypeFormatsList(
        spec,
        DefaultFieldFormat as FieldFormatInstanceType,
        fieldFormats
      ),
      fieldFormatId: indexPattern.getFormatterForFieldNoDefault(spec.name)?.type?.id,
      fieldFormatParams: format.params(),
      format,
    };
  }
  onFormatChange = (formatId: string, params?: any) => {
    const { fieldTypeFormats } = this.state;
    const { fieldFormats, uiSettings } = this.props;

    const FieldFormatClass = fieldFormats.getType(
      formatId || (fieldTypeFormats[0] as InitialFieldTypeFormat).defaultFieldFormat.id
    ) as FieldFormatInstanceType;

    const newFormat = new FieldFormatClass(params, (key: string) => uiSettings.get(key));

    this.setState({
      fieldFormatId: formatId,
      fieldFormatParams: params,
      format: newFormat,
    });
  };
  onFormatParamsChange = (newParams: { fieldType: string; [key: string]: any }) => {
    const { fieldFormatId } = this.state;
    this.onFormatChange(fieldFormatId as string, newParams);
  };

  render() {
    const { spec, fieldFormatEditors, onChange, onError } = this.props;

    const { fieldTypeFormats, format, fieldFormatId, fieldFormatParams } = this.state;

    const defaultFormat = (fieldTypeFormats[0] as InitialFieldTypeFormat).defaultFieldFormat.title;

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
        <EuiFormRow
          label={label}
          helpText={
            <FormattedMessage
              id="indexPatternFieldEditor.formatLabel"
              defaultMessage="Formatting allows you to control the way that specific values are displayed. It can also cause values to be
          completely changed and prevent highlighting in Discover from working."
            />
          }
        >
          <EuiSelect
            value={fieldFormatId}
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
            fieldType={spec.type}
            fieldFormat={format}
            fieldFormatId={fieldFormatId}
            fieldFormatParams={fieldFormatParams || {}}
            fieldFormatEditors={fieldFormatEditors}
            onChange={(params) => {
              onChange(
                params && {
                  id: fieldFormatId,
                  params,
                }
              );
              this.onFormatChange(fieldFormatId, params);
            }}
            onError={onError}
          />
        ) : null}
      </>
    );
  }
}
