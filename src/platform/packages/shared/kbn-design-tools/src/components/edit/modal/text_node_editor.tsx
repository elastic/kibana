/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiFieldText,
  EuiColorPicker,
  EuiColorPickerSwatch,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface TextNodeEntry {
  node: Text;
  text: string;
  color: string;
}

interface Props {
  entries: TextNodeEntry[];
  onChange: (index: number, updates: { text?: string; color?: string }) => void;
}

export const TextNodeEditor = ({ entries, onChange }: Props) => {
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
              <EuiFieldText
                value={entry.text}
                onChange={(e) => handleTextChange(idx, e.target.value)}
                compressed
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiColorPicker
                onChange={(value) => handleColorChange(idx, value)}
                color={entry.color}
                secondaryInputDisplay="top"
                button={
                  <EuiColorPickerSwatch
                    color={entry.color || undefined}
                    aria-label={i18n.translate('kbnDesignTools.edit.modal.textColor', {
                      defaultMessage: 'Text color',
                    })}
                  />
                }
                isClearable
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ))}
    </>
  );
};
