/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import classNames from 'classnames';
import React, { BaseSyntheticEvent } from 'react';

import { EuiButtonEmpty, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

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
}

export const ColorPicker = ({ onChange, color: selectedColor, id, label }: ColorPickerProps) => (
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
    {legendColors.some((c) => c === selectedColor) && (
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
);
