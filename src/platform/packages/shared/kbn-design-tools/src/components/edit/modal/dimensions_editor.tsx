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
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

interface DimensionEntry {
  property: string;
  label: string;
  value: string;
  originalValue: string;
}

interface Props {
  entries: DimensionEntry[];
  onChange: (property: string, value: string) => void;
  onReset?: (property: string) => void;
  onFocus?: () => void;
}

const parsePx = (value: string): number => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const comboCss = css({ minWidth: 160 });

/**
 * Editor for CSS dimension properties (width, height, padding, margin,
 * border-radius). Shows a numeric input with "px" append and an EUI
 * size-token preset selector.
 */
export const DimensionsEditor = ({ entries, onChange, onReset, onFocus }: Props) => {
  const { euiTheme } = useEuiTheme();

  const sizeEntries = useMemo(
    () =>
      Object.entries(euiTheme.size).map(([key, value]) => ({
        key,
        value: String(value),
        px: parsePx(String(value)),
      })),
    [euiTheme.size]
  );

  return (
    <>
      {entries.map((entry) => (
        <DimensionField
          key={entry.property}
          entry={entry}
          sizeEntries={sizeEntries}
          onChange={onChange}
          onReset={onReset}
          onFocus={onFocus}
        />
      ))}
    </>
  );
};

const DimensionField = ({
  entry,
  sizeEntries,
  onChange,
  onReset,
  onFocus,
}: {
  entry: DimensionEntry;
  sizeEntries: Array<{ key: string; value: string; px: number }>;
  onChange: (property: string, value: string) => void;
  onReset?: (property: string) => void;
  onFocus?: () => void;
}) => {
  const numericValue = parsePx(entry.value);

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      sizeEntries.map((s) => ({
        label: `${s.key} (${s.value})`,
        value: s.value,
      })),
    [sizeEntries]
  );

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const match = sizeEntries.find((s) => s.px === numericValue);
    if (match) {
      return [{ label: `${match.key} (${match.value})`, value: match.value }];
    }
    return [{ label: String(numericValue), value: `${numericValue}px` }];
  }, [sizeEntries, numericValue]);

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      if (selected.length > 0 && selected[0].value) {
        onChange(entry.property, selected[0].value);
      }
    },
    [onChange, entry.property]
  );

  const handleCreateOption = useCallback(
    (searchValue: string) => {
      const trimmed = searchValue.replace(/px$/i, '').trim();
      const num = Number(trimmed);
      if (trimmed === '' || isNaN(num)) return false;
      const rounded = Math.max(0, Math.round(num));
      onChange(entry.property, `${rounded}px`);
      return true;
    },
    [onChange, entry.property]
  );

  const isChanged = entry.value !== entry.originalValue;

  return (
    <EuiFormRow label={entry.label}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <div className={comboCss} onFocusCapture={onFocus}>
            <EuiComboBox
              aria-label={entry.label}
              options={options}
              selectedOptions={selectedOptions}
              onChange={handleChange}
              onCreateOption={handleCreateOption}
              singleSelection={{ asPlainText: true }}
              compressed
              isClearable={false}
              customOptionText={i18n.translate(
                'kbnDesignTools.edit.modal.dimensions.customOption',
                {
                  defaultMessage: 'Set to {searchValue}px',
                  values: { searchValue: '{searchValue}' },
                }
              )}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('kbnDesignTools.edit.modal.resetDimension', {
              defaultMessage: 'Reset to original value',
            })}
          >
            <EuiButtonIcon
              iconType="undo"
              aria-label={i18n.translate('kbnDesignTools.edit.modal.resetDimensionAria', {
                defaultMessage: 'Reset {label} to original value',
                values: { label: entry.label },
              })}
              onClick={() => onReset?.(entry.property)}
              disabled={!isChanged}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
