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

import classNames from 'classnames';
import React, { BaseSyntheticEvent } from 'react';

import { EuiButtonEmpty, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { lightenColor } from './lighten_color';

import './color_picker.scss';

export const legendColors: string[] = [
  '#3F6833',
  '#967302',
  '#2F575E',
  '#99440A',
  '#58140C',
  '#052B51',
  '#511749',
  '#3F2B5B',
  '#508642',
  '#CCA300',
  '#447EBC',
  '#C15C17',
  '#890F02',
  '#0A437C',
  '#6D1F62',
  '#584477',
  '#629E51',
  '#E5AC0E',
  '#64B0C8',
  '#E0752D',
  '#BF1B00',
  '#0A50A1',
  '#962D82',
  '#614D93',
  '#7EB26D',
  '#EAB839',
  '#6ED0E0',
  '#EF843C',
  '#E24D42',
  '#1F78C1',
  '#BA43A9',
  '#705DA0',
  '#9AC48A',
  '#F2C96D',
  '#65C5DB',
  '#F9934E',
  '#EA6460',
  '#5195CE',
  '#D683CE',
  '#806EB7',
  '#B7DBAB',
  '#F4D598',
  '#70DBED',
  '#F9BA8F',
  '#F29191',
  '#82B5D8',
  '#E5A8E2',
  '#AEA2E0',
  '#E0F9D7',
  '#FCEACA',
  '#CFFAFF',
  '#F9E2D2',
  '#FCE2DE',
  '#BADFF4',
  '#F9D9F9',
  '#DEDAF7',
];

interface ColorPickerProps {
  id?: string;
  label: string | number | null;
  onChange: (color: string | null, event: BaseSyntheticEvent) => void;
  color: string;
  maxDepth: number;
}

export const ColorPicker = ({
  onChange,
  color: selectedColor,
  id,
  label,
  maxDepth,
}: ColorPickerProps) => (
  <I18nProvider>
    <div className="visColorPicker">
      <span id={`${id}ColorPickerDesc`} className="euiScreenReaderOnly">
        <FormattedMessage
          id="charts.colorPicker.setColor.screenReaderDescription"
          defaultMessage="Set color for value {legendDataLabel}"
          values={{ legendDataLabel: label }}
        />
      </span>
      <div className="visColorPicker__value" role="listbox">
        {legendColors.map((color) => (
          <EuiIcon
            role="option"
            tabIndex={0}
            type="dot"
            size="l"
            color={selectedColor}
            key={color}
            aria-label={color}
            aria-describedby={`${id}ColorPickerDesc`}
            aria-selected={color === selectedColor}
            onClick={(e) => onChange(color, e)}
            onKeyPress={(e) => onChange(color, e)}
            className={classNames('visColorPicker__valueDot', {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              'visColorPicker__valueDot-isSelected': color === selectedColor,
            })}
            style={{ color }}
            data-test-subj={`visColorPickerColor-${color}`}
          />
        ))}
      </div>
      {legendColors.some(
        (c) => c === selectedColor || lightenColor(c, maxDepth, maxDepth) === selectedColor
      ) && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={(e: any) => onChange(null, e)}
            onKeyPress={(e: any) => onChange(null, e)}
          >
            <FormattedMessage id="charts.colorPicker.clearColor" defaultMessage="Clear color" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </div>
  </I18nProvider>
);
