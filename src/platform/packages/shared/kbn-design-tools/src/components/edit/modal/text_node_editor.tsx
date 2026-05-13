/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { EuiColorTokenSelect } from '../../eui_color_token_select';
import { ExpandableTextInput } from './expandable_text_input';

const colorColumnCss = css({ minWidth: 140 });

export interface TextNodeEntry {
  node: Text;
  text: string;
  color: string;
}

interface Props {
  entries: TextNodeEntry[];
  onChange: (index: number, updates: { text?: string; color?: string }) => void;
  onFocus?: (index: number) => void;
}

export const TextNodeEditor = ({ entries, onChange, onFocus }: Props) => {
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

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry, idx) => (
        <EuiFormRow
          key={idx}
          label={i18n.translate('kbnDesignTools.edit.modal.textNode', {
            defaultMessage: 'Text {index}',
            values: { index: idx + 1 },
          })}
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
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
          </EuiFlexGroup>
        </EuiFormRow>
      ))}
    </>
  );
};
