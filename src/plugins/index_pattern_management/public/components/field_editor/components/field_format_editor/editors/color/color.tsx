/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment } from 'react';

import { EuiBasicTable, EuiButton, EuiColorPicker, EuiFieldText, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DefaultFormatEditor, FormatEditorProps } from '../default';

import { fieldFormats } from '../../../../../../../../../plugins/data/public';

interface Color {
  range?: string;
  regex?: string;
  text: string;
  background: string;
}

interface IndexedColor extends Color {
  index: number;
}

interface ColorFormatEditorFormatParams {
  colors: Color[];
}

export class ColorFormatEditor extends DefaultFormatEditor<ColorFormatEditorFormatParams> {
  static formatId = 'color';
  constructor(props: FormatEditorProps<ColorFormatEditorFormatParams>) {
    super(props);
    this.onChange({
      fieldType: props.fieldType,
    });
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
    const colors = [...this.props.formatParams.colors];
    this.onChange({
      colors: [...colors, { ...fieldFormats.DEFAULT_CONVERTER_COLOR }],
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
    const { formatParams, fieldType } = this.props;

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
                id="indexPatternManagement.color.patternLabel"
                defaultMessage="Pattern (regular expression)"
              />
            ),
            render: (value: string, item: IndexedColor) => {
              return (
                <EuiFieldText
                  value={value}
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
                id="indexPatternManagement.color.rangeLabel"
                defaultMessage="Range (min:max)"
              />
            ),
            render: (value: string, item: IndexedColor) => {
              return (
                <EuiFieldText
                  value={value}
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
            id="indexPatternManagement.color.textColorLabel"
            defaultMessage="Text color"
          />
        ),
        render: (color: string, item: IndexedColor) => {
          return (
            <EuiColorPicker
              color={color}
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
            id="indexPatternManagement.color.backgroundLabel"
            defaultMessage="Background color"
          />
        ),
        render: (color: string, item: IndexedColor) => {
          return (
            <EuiColorPicker
              color={color}
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
            id="indexPatternManagement.color.exampleLabel"
            defaultMessage="Example"
          />
        ),
        render: (item: IndexedColor) => {
          return (
            <div
              style={{
                background: item.background,
                color: item.text,
              }}
            >
              123456
            </div>
          );
        },
      },
      {
        field: 'actions',
        name: i18n.translate('indexPatternManagement.color.actions', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate('indexPatternManagement.color.deleteAria', {
              defaultMessage: 'Delete',
            }),
            description: i18n.translate('indexPatternManagement.color.deleteTitle', {
              defaultMessage: 'Delete color format',
            }),
            onClick: (item: IndexedColor) => {
              this.removeColor(item.index);
            },
            type: 'icon',
            icon: 'trash',
            color: 'danger',
            available: () => items.length > 1,
          },
        ],
      },
    ];

    return (
      <Fragment>
        <EuiBasicTable items={items} columns={columns} />
        <EuiSpacer size="m" />
        <EuiButton iconType="plusInCircle" size="s" onClick={this.addColor}>
          <FormattedMessage
            id="indexPatternManagement.color.addColorButton"
            defaultMessage="Add color"
          />
        </EuiButton>
        <EuiSpacer size="l" />
      </Fragment>
    );
  }
}
