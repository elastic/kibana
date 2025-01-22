/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { DEFAULT_CONVERTER_COLOR } from '@kbn/field-formats-plugin/common';
import { Color, ColorRow } from './color_row';
import { DefaultFormatEditor } from '../default/default';
import { formatId } from './constants';

import { FormatEditorProps } from '../types';

export interface ColorFormatEditorFormatParams {
  colors: Color[];
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
    const { formatParams, fieldType } = this.props;

    const colors = formatParams?.colors;

    return (
      <>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="indexPatternFieldEditor.color.colorFormatterTitle"
                defaultMessage="Color formatting"
              />
            </h4>
          </EuiTitle>
          {colors?.length > 0 &&
            colors.map((color, index) => {
              return (
                <ColorRow
                  key={index}
                  fieldType={fieldType}
                  color={color}
                  index={index}
                  onColorChange={this.onColorChange}
                  onRemoveColor={this.removeColor}
                  showDeleteButton={colors?.length > 1}
                />
              );
            })}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiButton
          iconType="plusInCircle"
          size="s"
          onClick={this.addColor}
          data-test-subj="colorEditorAddColor"
        >
          <FormattedMessage
            id="indexPatternFieldEditor.color.addColorButton"
            defaultMessage="Add color"
          />
        </EuiButton>
        <EuiSpacer size="l" />
      </>
    );
  }
}
