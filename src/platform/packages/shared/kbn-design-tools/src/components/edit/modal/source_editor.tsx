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
  EuiFormRow,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpandableTextInput } from './expandable_text_input';

export interface SourceEditorEntry {
  element: Element;
  attribute: string;
  value: string;
  originalValue: string;
  label: string;
}

interface Props {
  entries: SourceEditorEntry[];
  onChange: (index: number, value: string) => void;
  onFocus?: (index: number) => void;
}

export const SourceEditor = ({ entries, onChange, onFocus }: Props) => {
  const handleChange = useCallback(
    (index: number, value: string) => {
      onChange(index, value);
    },
    [onChange]
  );

  const handleReset = useCallback(
    (index: number) => {
      const entry = entries[index];
      if (entry) {
        onChange(index, entry.originalValue);
      }
    },
    [entries, onChange]
  );

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry, idx) => (
        <EuiFormRow
          key={idx}
          label={
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('kbnDesignTools.edit.modal.source', {
                  defaultMessage: 'Source {index}',
                  values: { index: idx + 1 },
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{entry.label}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <ExpandableTextInput
                value={entry.value}
                onChange={(value) => handleChange(idx, value)}
                onFocus={() => onFocus?.(idx)}
                rows={2}
                placeholder={i18n.translate('kbnDesignTools.edit.modal.sourcePlaceholder', {
                  defaultMessage: 'Enter URL or path',
                })}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('kbnDesignTools.edit.modal.resetSource', {
                  defaultMessage: 'Reset to original source',
                })}
              >
                <EuiButtonIcon
                  iconType="undo"
                  aria-label={i18n.translate('kbnDesignTools.edit.modal.resetSourceAria', {
                    defaultMessage: 'Reset source to original value',
                  })}
                  onClick={() => handleReset(idx)}
                  disabled={entry.value === entry.originalValue}
                  size="s"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ))}
    </>
  );
};
