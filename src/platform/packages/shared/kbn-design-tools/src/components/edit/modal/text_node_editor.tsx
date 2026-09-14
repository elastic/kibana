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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { COMBO_POPOVER_PROPS } from '../../../lib/constants';
import { EuiColorTokenSelect } from '../../eui_color_token_select';
import { ExpandableTextInput } from './expandable_text_input';

const colorColumnCss = css({ minWidth: 140 });
const fontSizeColumnCss = css({ width: 200 });
const weightColumnCss = css({ width: 144 });

const FONT_WEIGHT_LABELS: Record<string, string> = {
  light: 'Light',
  regular: 'Regular',
  medium: 'Medium',
  semiBold: 'Semi Bold',
  bold: 'Bold',
};

export interface TextNodeEntry {
  node: Text;
  text: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  originalText: string;
  originalColor: string;
  originalFontSize: string;
  originalFontWeight: string;
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

  const fontWeightOptions = useMemo(() => {
    const opts = [];
    for (const [key, weight] of Object.entries(euiTheme.font.weight)) {
      const label = FONT_WEIGHT_LABELS[key] ?? key;
      opts.push({ value: String(weight), text: `${weight} (${label})` });
    }
    return opts;
  }, [euiTheme.font.weight]);

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
          ? [
              fontSizeOptions.find((o) => o.value === entry.fontSize) ?? {
                label: entry.fontSize,
                value: entry.fontSize,
              },
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
              <EuiFlexItem grow={false} css={colorColumnCss}>
                <EuiColorTokenSelect
                  color={entry.color}
                  onChange={(value) => handleColorChange(idx, value)}
                  onFocus={() => onFocus?.(idx)}
                  preferText
                  colorPickerLabel={i18n.translate('kbnDesignTools.edit.modal.textColor', {
                    defaultMessage: 'Text color',
                  })}
                  inputPopoverProps={COMBO_POPOVER_PROPS}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={fontSizeColumnCss}>
                <div onFocusCapture={() => onFocus?.(idx)}>
                  <EuiComboBox
                    aria-label={i18n.translate('kbnDesignTools.edit.modal.fontSize', {
                      defaultMessage: 'Font size',
                    })}
                    options={fontSizeOptions}
                    selectedOptions={selectedFontSize}
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
                    inputPopoverProps={COMBO_POPOVER_PROPS}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={weightColumnCss}>
                <div onFocusCapture={() => onFocus?.(idx)}>
                  <EuiSelect
                    aria-label={i18n.translate('kbnDesignTools.edit.modal.fontWeight', {
                      defaultMessage: 'Font weight',
                    })}
                    options={fontWeightOptions}
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
