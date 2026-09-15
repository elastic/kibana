/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpandableTextInput } from './expandable_text_input';
import { IconPicker } from './icon_picker';

export interface MediaEditorEntry {
  element: Element;
  attribute: string;
  value: string;
  originalValue: string;
  label: string;
}

interface Props {
  entries: MediaEditorEntry[];
  onChange: (index: number, value: string) => void;
  onFocus?: (index: number) => void;
}

export const MediaEditor = ({ entries, onChange, onFocus }: Props) => {
  const handleChange = useCallback(
    (index: number, value: string) => {
      onChange(index, value);
    },
    [onChange]
  );

  if (entries.length === 0) return null;

  return (
    <>
      {entries.map((entry, idx) => (
        <EuiFormRow
          key={`${entry.label}-${entry.attribute}-${idx}`}
          label={
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('kbnDesignTools.edit.modal.media', {
                  defaultMessage: 'Media {index}',
                  values: { index: idx + 1 },
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{entry.label}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <EuiFlexItem>
            {entry.label === 'icon' ? (
              <IconPicker
                value={entry.value}
                onChange={(value) => handleChange(idx, value)}
                onFocus={() => onFocus?.(idx)}
                aria-label={i18n.translate('kbnDesignTools.edit.modal.iconPickerAria', {
                  defaultMessage: 'Select icon type',
                })}
              />
            ) : (
              <ExpandableTextInput
                value={entry.value}
                onChange={(value) => handleChange(idx, value)}
                onFocus={() => onFocus?.(idx)}
                rows={2}
                placeholder={i18n.translate('kbnDesignTools.edit.modal.mediaPlaceholder', {
                  defaultMessage: 'Enter URL or path',
                })}
              />
            )}
          </EuiFlexItem>
        </EuiFormRow>
      ))}
    </>
  );
};
