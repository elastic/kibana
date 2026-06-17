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
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useEuiColorTokens } from '../hooks/use_eui_color_tokens';
import type { EuiColorToken } from '../hooks/use_eui_color_tokens';
import { getPageColorMode } from '../lib/dom/get_page_color_mode';
import { isTextToken, isBgToken } from '../lib/dom/color_token_lookup';
import { getTokenVar, parseTokenVar } from '../lib/dom/color_token_stylesheet';

interface Props {
  color: string;
  onChange: (color: string) => void;
  compressed?: boolean;
  colorPickerLabel?: string;
  /** When true, prefer text tokens. */
  preferText?: boolean;
  /** Called when the color picker receives focus (click on combobox or swatch). */
  onFocus?: () => void;
  /** Extra props forwarded to the combobox input popover panel. */
  inputPopoverProps?: Record<string, unknown>;
  /** When true, the container stretches to fill its parent instead of using a fixed width. */
  fullWidth?: boolean;
}

const CONTAINER_WIDTH = 344;

const comboInputCss = css({
  '& .euiComboBox__input': {
    textOverflow: 'ellipsis',
  },
});

const fixedWidthCss = css({
  width: CONTAINER_WIDTH,
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
  inputPopoverProps,
  fullWidth = false,
}: Props) => {
  const pageColorMode = getPageColorMode();

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
        inputPopoverProps={inputPopoverProps}
        fullWidth={fullWidth}
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
  inputPopoverProps: extraPopoverProps,
  fullWidth = false,
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
    // When the value is a var(--dt-*) reference, extract the token name
    // and match by label instead of hex value.
    const tokenName = parseTokenVar(color);
    if (tokenName) {
      const byLabel = options.find((o) => o.label === tokenName);
      if (byLabel) return [byLabel];
    }

    const normalized = color.toLowerCase();

    // Prefer the last explicitly selected label when multiple tokens share a hex
    if (selectedLabel) {
      const preferred = options.find((o) => o.label === selectedLabel && o.value === normalized);
      if (preferred) return [preferred];
    }

    const matches = options.filter((o) => o.value === normalized);
    if (matches.length > 1 && preferText) {
      const textMatch = matches.find((o) => isTextToken(o.label));
      if (textMatch) return [textMatch];
    }
    if (matches.length > 1 && !preferText) {
      const bgMatch = matches.find((o) => isBgToken(o.label));
      if (bgMatch) return [bgMatch];
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
        // Emit a var(--dt-*) reference when the user picks a token,
        // or a plain hex when the label matches the raw value.
        const isToken = selected[0].label !== selected[0].value;
        onChange(isToken ? getTokenVar(selected[0].label, selected[0].value) : selected[0].value);
      }
    },
    [onChange]
  );

  const renderOption = useCallback(
    (option: EuiComboBoxOptionOption<string>) => (
      <span css={optionCss}>
        <EuiIcon type="stopFilled" color={option.value ?? ''} size="s" aria-hidden />
        <span css={labelCss}>{option.label}</span>
      </span>
    ),
    []
  );

  const handleSwatchChange = useCallback(
    (newColor: string) => {
      setSelectedLabel(null);
      // Raw color picker, no token name available.
      onChange(newColor);
    },
    [onChange]
  );

  // Resolve the display color: when the value is a var() reference,
  // use the matched option's hex so the swatch shows the right color.
  const displayColor = useMemo(() => {
    if (parseTokenVar(color)) {
      return selectedOptions[0]?.value ?? color;
    }
    return color;
  }, [color, selectedOptions]);

  const appendSwatch = useMemo(
    () => (
      <EuiColorPicker
        color={displayColor}
        onChange={handleSwatchChange}
        showAlpha
        swatches={[]}
        isClearable
        aria-label={colorPickerLabel}
        button={
          <EuiColorPickerSwatch color={displayColor || undefined} aria-label={colorPickerLabel} />
        }
      />
    ),
    [displayColor, handleSwatchChange, colorPickerLabel]
  );

  return (
    <div css={[comboInputCss, !fullWidth && fixedWidthCss]} onFocusCapture={onFocus}>
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
        inputPopoverProps={{ ...extraPopoverProps }}
      />
    </div>
  );
};
