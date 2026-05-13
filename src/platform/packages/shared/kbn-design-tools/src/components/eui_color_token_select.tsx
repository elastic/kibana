/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiComboBox,
  EuiIcon,
  EuiColorPicker,
  EuiColorPickerSwatch,
  EuiThemeProvider,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useEuiColorTokens, usePageColorMode } from '../hooks';
import type { EuiColorToken } from '../hooks';

const TEXT_TOKENS = new Set([
  'textParagraph',
  'textHeading',
  'textSubdued',
  'textGhost',
  'textInk',
  'link',
  'textPrimary',
  'textAccent',
  'textAccentSecondary',
  'textNeutral',
  'textSuccess',
  'textWarning',
  'textRisk',
  'textDanger',
  'textAssistance',
]);

interface Props {
  color: string;
  onChange: (color: string) => void;
  compressed?: boolean;
  colorPickerLabel?: string;
  /** When true, prefer text tokens. */
  preferText?: boolean;
  /** Called when the color picker receives focus (click on combobox or swatch). */
  onFocus?: () => void;
}

const CONTAINER_WIDTH = 160;

const containerCss = css({
  width: CONTAINER_WIDTH,
  '& .euiComboBox__input': {
    textOverflow: 'ellipsis',
  },
});

const optionCss = css({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  overflow: 'hidden',
});

const labelCss = css({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const EuiColorTokenSelect = ({
  color,
  onChange,
  compressed = true,
  colorPickerLabel = 'Color',
  preferText = false,
  onFocus,
}: Props) => {
  const pageColorMode = usePageColorMode();

  // Resolve tokens in the page's color mode so hex values match the actual page
  return (
    <EuiThemeProvider colorMode={pageColorMode}>
      <TokenResolver
        color={color}
        onChange={onChange}
        compressed={compressed}
        colorPickerLabel={colorPickerLabel}
        preferText={preferText}
        onFocus={onFocus}
      />
    </EuiThemeProvider>
  );
};

/**
 * Reads EUI color tokens in the page's color mode context, then restores
 * dark mode for the visual UI so the controls match the toolbar appearance.
 */
const TokenResolver = (props: Props) => {
  const tokens = useEuiColorTokens();

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiColorTokenSelectInner {...props} tokens={tokens} />
    </EuiThemeProvider>
  );
};

const EuiColorTokenSelectInner = ({
  color,
  onChange,
  compressed = true,
  colorPickerLabel = 'Color',
  preferText = false,
  onFocus,
  tokens,
}: Props & { tokens: EuiColorToken[] }) => {
  // Track the last label selected from the dropdown so that tokens sharing
  // the same hex value (e.g. plainLight / fullShade) display correctly.
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  const options: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      tokens.map((token) => ({
        label: token.label,
        value: token.color,
      })),
    [tokens]
  );

  const selectedOptions = useMemo(() => {
    const normalized = color.toLowerCase();

    // Prefer the last explicitly selected label when multiple tokens share a hex
    if (selectedLabel) {
      const preferred = options.find((o) => o.label === selectedLabel && o.value === normalized);
      if (preferred) return [preferred];
    }

    const matches = options.filter((o) => o.value === normalized);
    if (matches.length > 1 && preferText) {
      const textMatch = matches.find((o) => TEXT_TOKENS.has(o.label));
      if (textMatch) return [textMatch];
    }
    if (matches.length > 0) return [matches[0]];
    // Show the raw hex value when the color doesn't match any token
    if (normalized) return [{ label: normalized, value: normalized }];
    return [];
  }, [options, color, selectedLabel, preferText]);

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      if (selected.length > 0 && selected[0].value) {
        setSelectedLabel(selected[0].label);
        onChange(selected[0].value);
      }
    },
    [onChange]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>) => (
      <span className={optionCss}>
        <EuiIcon type="stopFilled" color={option.value ?? ''} size="s" aria-hidden />
        <span className={labelCss}>{option.label}</span>
      </span>
    ),
    []
  );

  const handleSwatchChange = useCallback(
    (newColor: string) => {
      setSelectedLabel(null);
      onChange(newColor);
    },
    [onChange]
  );

  const appendSwatch = useMemo(
    () => (
      <EuiColorPicker
        color={color}
        onChange={handleSwatchChange}
        showAlpha
        swatches={[]}
        isClearable
        aria-label={colorPickerLabel}
        button={<EuiColorPickerSwatch color={color || undefined} aria-label={colorPickerLabel} />}
      />
    ),
    [color, handleSwatchChange, colorPickerLabel]
  );

  return (
    <div className={containerCss} onFocusCapture={onFocus}>
      <EuiComboBox
        aria-label={i18n.translate('kbnDesignTools.colorTokenSelect.ariaLabel', {
          defaultMessage: 'Select color token',
        })}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        renderOption={renderOption}
        singleSelection={{ asPlainText: true }}
        compressed={compressed}
        isClearable={false}
        truncationProps={{ truncation: 'end' }}
        append={appendSwatch}
        inputPopoverProps={{ panelMinWidth: CONTAINER_WIDTH * 2 }}
      />
    </div>
  );
};
