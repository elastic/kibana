/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeEvent, KeyboardEvent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFormRow,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { COMBO_POPOVER_PROPS } from '../../../lib/constants';
import { parsePx } from '../../../lib/dom/round_px_value';
import { isEnterKey } from '../../../lib/keyboard_shortcuts';

interface DimensionEntry {
  property: string;
  label: string;
  value: string;
  originalValue: string;
}

export type { DimensionEntry };

interface Props {
  entries: DimensionEntry[];
  onChange: (property: DimensionEntry['property'], value: string) => void;
  onFocus?: () => void;
}

const comboCss = css({ width: 200 });
const pxInputCss = css({ width: 144 });

export const DimensionsEditor = ({ entries, onChange, onFocus }: Props) => {
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
  onFocus,
}: {
  entry: DimensionEntry;
  sizeEntries: Array<{ key: string; value: string; px: number }>;
  onChange: (property: string, value: string) => void;
  onFocus?: () => void;
}) => {
  const numericValue = parsePx(entry.value);
  const [localPx, setLocalPx] = useState<string>(String(numericValue));
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync local px input when the value changes externally (e.g. undo/redo)
  useEffect(() => {
    const externalPx = parsePx(entry.value);
    // Only sync if the input is not focused (user is not actively editing)
    if (!inputRef.current?.contains(document.activeElement)) {
      setLocalPx(String(externalPx));
    }
  }, [entry.value]);

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
    return [];
  }, [sizeEntries, numericValue]);

  const handleTokenChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      if (selected.length > 0 && selected[0].value) {
        const px = parsePx(selected[0].value);
        setLocalPx(String(px));
        onChange(entry.property, selected[0].value);
      }
    },
    [onChange, entry.property]
  );

  const handlePxChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLocalPx(e.target.value);
  }, []);

  const commitPxValue = useCallback(() => {
    const num = Number(localPx);
    if (localPx === '' || isNaN(num)) {
      setLocalPx(String(numericValue));
      return;
    }
    const rounded = Math.max(0, Math.round(num));
    setLocalPx(String(rounded));
    onChange(entry.property, `${rounded}px`);
  }, [localPx, numericValue, onChange, entry.property]);

  const handlePxKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isEnterKey(e.nativeEvent)) {
        commitPxValue();
      }
    },
    [commitPxValue]
  );

  return (
    <EuiFormRow label={entry.label}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <div css={comboCss} onFocusCapture={onFocus}>
            <EuiComboBox
              aria-label={i18n.translate('kbnDesignTools.edit.modal.dimensions.tokenAriaLabel', {
                defaultMessage: '{label} token',
                values: { label: entry.label },
              })}
              options={options}
              selectedOptions={selectedOptions}
              onChange={handleTokenChange}
              singleSelection={{ asPlainText: true }}
              compressed
              isClearable={false}
              placeholder={i18n.translate('kbnDesignTools.edit.modal.dimensions.tokenPlaceholder', {
                defaultMessage: 'EUI token',
              })}
              inputPopoverProps={COMBO_POPOVER_PROPS}
            />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div css={pxInputCss} onFocusCapture={onFocus}>
            <EuiFieldNumber
              inputRef={(el) => {
                inputRef.current = el;
              }}
              aria-label={i18n.translate('kbnDesignTools.edit.modal.dimensions.pxAriaLabel', {
                defaultMessage: '{label} pixels',
                values: { label: entry.label },
              })}
              value={localPx}
              onChange={handlePxChange}
              onBlur={commitPxValue}
              onKeyDown={handlePxKeyDown}
              compressed
              append="px"
              min={0}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
