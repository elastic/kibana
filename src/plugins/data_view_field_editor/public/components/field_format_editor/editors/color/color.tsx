/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import {
  EuiBasicTable,
  EuiButton,
  EuiColorPicker,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DEFAULT_CONVERTER_COLOR, ColorFormat } from '@kbn/field-formats-plugin/common';
import { DefaultFormatEditor } from '../default/default';
import { formatId } from './constants';

import { FormatEditorProps } from '../types';

interface Color {
  range?: string;
  regex?: string;
  text: string;
  background: string;
}

interface IndexedColor extends Color {
  index: number;
}

export interface ColorFormatEditorFormatParams {
  colors: Color[];
  transform: string | undefined;
}

export class ColorFormatEditor extends DefaultFormatEditor<ColorFormatEditorFormatParams> {
  static formatId = formatId;
  constructor(props: FormatEditorProps<ColorFormatEditorFormatParams>) {
    super(props);
    this.onChange({
      fieldType: props.fieldType, // FIXME: why add `fieldType` as an EditorFormatParam?
    } as unknown as ColorFormatEditorFormatParams);
  }

  onColorChange = (newColorParams: Partial<Color>, index: number) => {
    const colors = [...this.props.formatParams.colors];
    colors[index] = {
      ...colors[index],
      ...newColorParams,
    };
    this.onChange({
      colors,
    });
  };

  addColor = () => {
    const colors = [...(this.props.formatParams.colors || [])];
    this.onChange({
      colors: [...colors, { ...DEFAULT_CONVERTER_COLOR }],
    });
  };

  removeColor = (index: number) => {
    const colors = [...this.props.formatParams.colors];
    colors.splice(index, 1);
    this.onChange({
      colors,
    });
  };

  render() {
    const { formatParams, fieldType, format, fieldFormats } = this.props;
    const { error } = this.state;

    const items =
      (formatParams.colors &&
        formatParams.colors.length &&
        formatParams.colors.map((color, index) => {
          return {
            ...color,
            index,
          };
        })) ||
      [];

    const columns = [
      fieldType === 'string'
        ? {
            field: 'regex',
            name: (
              <FormattedMessage
                id="indexPatternFieldEditor.color.patternLabel"
                defaultMessage="Pattern (regular expression)"
              />
            ),
            render: (value: string, item: IndexedColor) => {
              return (
                <EuiFieldText
                  value={value}
                  data-test-subj={`colorEditorKeyPattern ${item.index}`}
                  onChange={(e) => {
                    this.onColorChange(
                      {
                        regex: e.target.value,
                      },
                      item.index
                    );
                  }}
                />
              );
            },
          }
        : {
            field: 'range',
            name: (
              <FormattedMessage
                id="indexPatternFieldEditor.color.rangeLabel"
                defaultMessage="Range (min:max)"
              />
            ),
            render: (value: string, item: IndexedColor) => {
              return (
                <EuiFieldText
                  value={value}
                  data-test-subj={`colorEditorKeyRange ${item.index}`}
                  onChange={(e) => {
                    this.onColorChange(
                      {
                        range: e.target.value,
                      },
                      item.index
                    );
                  }}
                />
              );
            },
          },
      {
        field: 'text',
        name: (
          <FormattedMessage
            id="indexPatternFieldEditor.color.textColorLabel"
            defaultMessage="Text color"
          />
        ),
        render: (color: string, item: IndexedColor) => {
          return (
            <EuiColorPicker
              color={color}
              data-test-subj={`colorEditorColorPicker ${item.index}`}
              onChange={(newColor) => {
                this.onColorChange(
                  {
                    text: newColor,
                  },
                  item.index
                );
              }}
            />
          );
        },
      },
      {
        field: 'background',
        name: (
          <FormattedMessage
            id="indexPatternFieldEditor.color.backgroundLabel"
            defaultMessage="Background color"
          />
        ),
        render: (color: string, item: IndexedColor) => {
          return (
            <EuiColorPicker
              color={color}
              data-test-subj={`colorEditorBackgroundPicker ${item.index}`}
              onChange={(newColor) => {
                this.onColorChange(
                  {
                    background: newColor,
                  },
                  item.index
                );
              }}
            />
          );
        },
      },
      {
        name: (
          <FormattedMessage
            id="indexPatternFieldEditor.color.exampleLabel"
            defaultMessage="Example"
          />
        ),
        render: (item: IndexedColor) => {
          const formatter = fieldFormats.getInstance(formatId, {
            ...format.params(),
            colors: [
              {
                ...DEFAULT_CONVERTER_COLOR,
                regex: '.+',
                background: item.background,
                text: item.text,
              },
            ],
          });

          return (
            <div
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{
                __html: formatter.getConverterFor('html')('123456'),
              }}
            />
          );
        },
      },
      {
        field: 'actions',
        name: i18n.translate('indexPatternFieldEditor.color.actions', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate('indexPatternFieldEditor.color.deleteAria', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('indexPatternFieldEditor.color.deleteTitle', {
              defaultMessage: 'Delete color format',
            }),
            onClick: (item: IndexedColor) => {
              this.removeColor(item.index);
            },
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            available: () => items.length > 1,
            'data-test-subj': 'colorEditorRemoveColor',
          },
        ],
      },
    ];

    return (
      <Fragment>
        <EuiFormRow
          label={
            <FormattedMessage
              id="indexPatternFieldEditor.color.transformLabel"
              defaultMessage="Transform"
            />
          }
          isInvalid={!!error}
          error={error}
        >
          <EuiSelect
            data-test-subj="colorEditorTransform"
            defaultValue={
              formatParams.transform ?? (format.type as typeof ColorFormat)?.legacyTransformOption
            }
            options={((format.type as typeof ColorFormat)?.transformOptions || []).map((option) => {
              return {
                value: option.kind,
                text: option.text,
              };
            })}
            onChange={(e) => {
              this.onChange({ transform: e.target.value });
            }}
            isInvalid={!!error}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiBasicTable items={items} columns={columns} />
        <EuiSpacer size="m" />
        <EuiButton
          iconType="plusInCircle"
          size="s"
          onClick={this.addColor}
          data-test-subj={'colorEditorAddColor'}
        >
          <FormattedMessage
            id="indexPatternFieldEditor.color.addColorButton"
            defaultMessage="Add color"
          />
        </EuiButton>
        <EuiSpacer size="l" />
      </Fragment>
    );
  }
}
