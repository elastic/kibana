/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiSelect,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { EuiColorTokenSelect } from '../../eui_color_token_select';
import { ExpandableTextInput } from './expandable_text_input';

const colorColumnCss = css({ minWidth: 140 });
const fontSizeColumnCss = css({ minWidth: 120 });
const weightColumnCss = css({ minWidth: 100 });

const FONT_WEIGHT_OPTIONS = [
  { value: '', text: '—' },
  { value: '300', text: '300 (Light)' },
  { value: '400', text: '400 (Regular)' },
  { value: '500', text: '500 (Medium)' },
  { value: '600', text: '600 (Semi Bold)' },
  { value: '700', text: '700 (Bold)' },
];

export interface TextNodeEntry {
  node: Text;
  text: string;
  color: string;
  fontSize: string;
  fontWeight: string;
}

interface Props {
  entries: TextNodeEntry[];
  onChange: (
    index: number,
    updates: {
      text?: string;
      color?: string;
      fontSize?: string;
      fontWeight?: string;
    }
  ) => void;
  onFocus?: (index: number) => void;
}

export const TextNodeEditor = ({ entries, onChange, onFocus }: Props) => {
  const { euiTheme } = useEuiTheme();

  const fontSizeOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const opts: Array<EuiComboBoxOptionOption<string>> = [];
    for (const [key, value] of Object.entries(euiTheme.size)) {
      opts.push({ label: `${key} (${value})`, value });
    }
    return opts;
  }, [euiTheme.size]);

  const handleTextChange = useCallback(
    (index: number, value: string) => {
      onChange(index, { text: value });
    },
    [onChange]
  );

  const handleColorChange = useCallback(
    (index: number, value: string) => {
      onChange(index, { color: value });
    },
    [onChange]
  );

  const handleFontSizeChange = useCallback(
    (index: number, selected: Array<EuiComboBoxOptionOption<string>>) => {
      if (selected.length > 0 && selected[0].value) {
        onChange(index, { fontSize: selected[0].value });
      }
    },
    [onChange]
  );

  const handleFontSizeCreate = useCallback(
    (index: number, searchValue: string) => {
      onChange(index, { fontSize: searchValue });
    },
    [onChange]
  );

  const handleFontWeightChange = useCallback(
    (index: number, value: string) => {
      onChange(index, { fontWeight: value });
    },
    [onChange]
  );

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry, idx) => {
        const selectedFontSize = entry.fontSize
          ? fontSizeOptions.find((o) => o.value === entry.fontSize) ?? [
              { label: entry.fontSize, value: entry.fontSize },
            ]
          : [];

        return (
          <EuiFormRow
            key={idx}
            label={i18n.translate('kbnDesignTools.edit.modal.textNode', {
              defaultMessage: 'Text {index}',
              values: { index: idx + 1 },
            })}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
              <EuiFlexItem>
                <ExpandableTextInput
                  value={entry.text}
                  onChange={(value) => handleTextChange(idx, value)}
                  onFocus={() => onFocus?.(idx)}
                  rows={4}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} className={colorColumnCss}>
                <EuiColorTokenSelect
                  color={entry.color}
                  onChange={(value) => handleColorChange(idx, value)}
                  onFocus={() => onFocus?.(idx)}
                  preferText
                  colorPickerLabel={i18n.translate('kbnDesignTools.edit.modal.textColor', {
                    defaultMessage: 'Text color',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} className={fontSizeColumnCss}>
                <div onFocusCapture={() => onFocus?.(idx)}>
                  <EuiComboBox
                    aria-label={i18n.translate('kbnDesignTools.edit.modal.fontSize', {
                      defaultMessage: 'Font size',
                    })}
                    options={fontSizeOptions}
                    selectedOptions={
                      Array.isArray(selectedFontSize) ? selectedFontSize : [selectedFontSize]
                    }
                    onChange={(selected) => handleFontSizeChange(idx, selected)}
                    onCreateOption={(searchValue) => handleFontSizeCreate(idx, searchValue)}
                    singleSelection={{ asPlainText: true }}
                    compressed
                    isClearable={false}
                    placeholder={i18n.translate('kbnDesignTools.edit.modal.fontSizePlaceholder', {
                      defaultMessage: 'Size',
                    })}
                    customOptionText={i18n.translate(
                      'kbnDesignTools.edit.modal.fontSizeCustomValue',
                      {
                        defaultMessage: 'Use {searchValue}',
                        values: { searchValue: '{searchValue}' },
                      }
                    )}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false} className={weightColumnCss}>
                <div onFocusCapture={() => onFocus?.(idx)}>
                  <EuiSelect
                    aria-label={i18n.translate('kbnDesignTools.edit.modal.fontWeight', {
                      defaultMessage: 'Font weight',
                    })}
                    options={FONT_WEIGHT_OPTIONS}
                    value={entry.fontWeight}
                    onChange={(e) => handleFontWeightChange(idx, e.target.value)}
                    compressed
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        );
      })}
    </>
  );
};
