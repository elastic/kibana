/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { getFontInfo } from '../lib/dom/get_font_info';
import { colorToToken, toHex } from '../lib/dom/color_token_lookup';
import { parsePx } from '../lib/dom/round_px_value';
import { useEuiFontWeightLookup } from './use_eui_font_weight_lookup';
import { useEuiFontScaleLookup } from './use_eui_font_scale_lookup';

export interface TokenRow {
  label: string;
  value: string;
  token?: string;
  swatchColor?: string;
}

export interface DesignTokenSections {
  fontFamily: string;
  rows: TokenRow[];
}

const colorToken = (value: string, cssProp: string): string | undefined => {
  const token = colorToToken(value, cssProp);
  return token ? `colors.${token}` : undefined;
};

const textColorRow = (cssValue: string): TokenRow => {
  const hex = toHex(cssValue);
  return {
    label: i18n.translate('kbnDesignTools.fontInspect.card.textColor', {
      defaultMessage: 'Text color',
    }),
    value: hex ?? cssValue,
    token: colorToken(cssValue, 'color'),
    swatchColor: hex ?? undefined,
  };
};

const mapToken = (
  lookup: Map<number, string>,
  value: string,
  prefix: string
): string | undefined => {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return undefined;
  const key = lookup.get(parsed);
  return key ? `${prefix}.${key}` : undefined;
};

const shouldShowLetterSpacing = (letterSpacing: string): boolean => {
  if (letterSpacing === 'normal' || letterSpacing === '0px' || letterSpacing === '0') {
    return false;
  }
  return parsePx(letterSpacing) !== 0;
};

/**
 * Resolves an element's computed typography and text color to EUI design
 * tokens when possible, falling back to raw CSS labels/values otherwise.
 */
export const useDesignTokenSections = (element: HTMLElement): DesignTokenSections => {
  const fontWeightLookup = useEuiFontWeightLookup();
  const fontScaleLookup = useEuiFontScaleLookup();

  return useMemo(() => {
    const fontInfo = getFontInfo(element);
    const textColor = getComputedStyle(element).color;

    const rows: TokenRow[] = [
      {
        label: i18n.translate('kbnDesignTools.fontInspect.card.size', {
          defaultMessage: 'Size',
        }),
        value: fontInfo.fontSize,
        token: mapToken(fontScaleLookup, fontInfo.fontSize, 'font.scale'),
      },
      {
        label: i18n.translate('kbnDesignTools.fontInspect.card.weight', {
          defaultMessage: 'Weight',
        }),
        value: fontInfo.fontWeight,
        token: mapToken(fontWeightLookup, fontInfo.fontWeight, 'font.weight'),
      },
      {
        label: i18n.translate('kbnDesignTools.fontInspect.card.lineHeight', {
          defaultMessage: 'Line height',
        }),
        value: fontInfo.lineHeight,
      },
    ];
    if (shouldShowLetterSpacing(fontInfo.letterSpacing)) {
      rows.push({
        label: i18n.translate('kbnDesignTools.fontInspect.card.letterSpacing', {
          defaultMessage: 'Letter spacing',
        }),
        value: fontInfo.letterSpacing,
      });
    }
    rows.push(textColorRow(textColor));

    return {
      fontFamily: fontInfo.fontFamily,
      rows,
    };
  }, [element, fontWeightLookup, fontScaleLookup]);
};
