/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFormRow, EuiComboBox, useEuiTheme } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

interface DimensionEntry {
  property: string;
  label: string;
  value: string;
}

interface Props {
  entries: DimensionEntry[];
  onChange: (property: string, value: string) => void;
  onFocus?: () => void;
}

const fieldCss = css({ minWidth: 120 });

/**
 * Editor for CSS dimension properties (width, height, padding, margin,
 * border-radius). Shows EUI size tokens as suggestions but allows freeform
 * CSS values.
 */
export const DimensionsEditor = ({ entries, onChange, onFocus }: Props) => {
  const { euiTheme } = useEuiTheme();

  const sizeOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const opts: Array<EuiComboBoxOptionOption<string>> = [];
    for (const [key, value] of Object.entries(euiTheme.size)) {
      opts.push({ label: `${key} (${value})`, value });
    }
    return opts;
  }, [euiTheme.size]);

  return (
    <>
      {entries.map((entry) => (
        <DimensionField
          key={entry.property}
          entry={entry}
          options={sizeOptions}
          onChange={onChange}
          onFocus={onFocus}
        />
      ))}
    </>
  );
};

const DimensionField = ({
  entry,
  options,
  onChange,
  onFocus,
}: {
  entry: DimensionEntry;
  options: Array<EuiComboBoxOptionOption<string>>;
  onChange: (property: string, value: string) => void;
  onFocus?: () => void;
}) => {
  const selectedOptions = useMemo(() => {
    if (!entry.value) return [];
    const match = options.find((o) => o.value === entry.value);
    if (match) return [match];
    return [{ label: entry.value, value: entry.value }];
  }, [entry.value, options]);

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      if (selected.length > 0 && selected[0].value) {
        onChange(entry.property, selected[0].value);
      }
    },
    [onChange, entry.property]
  );

  const handleCreate = useCallback(
    (searchValue: string) => {
      onChange(entry.property, searchValue);
    },
    [onChange, entry.property]
  );

  return (
    <EuiFormRow label={entry.label}>
      <div className={fieldCss} onFocusCapture={onFocus}>
        <EuiComboBox
          aria-label={entry.label}
          options={options}
          selectedOptions={selectedOptions}
          onChange={handleChange}
          onCreateOption={handleCreate}
          singleSelection={{ asPlainText: true }}
          compressed
          isClearable={false}
          customOptionText={i18n.translate('kbnDesignTools.edit.modal.dimensions.customValue', {
            defaultMessage: 'Use {searchValue}',
            values: { searchValue: '{searchValue}' },
          })}
        />
      </div>
    </EuiFormRow>
  );
};
