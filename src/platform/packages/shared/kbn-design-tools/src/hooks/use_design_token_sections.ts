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
import { useEuiFontWeightLookup } from './use_eui_font_weight_lookup';
import { useEuiFontScaleLookup } from './use_eui_font_scale_lookup';

export interface ElementStyleRow {
  label: string;
  cssValue: string;
  euiToken?: string;
  swatchColor?: string;
}

export interface ElementStyleSummary {
  fontFamily: string;
  rows: ElementStyleRow[];
}

const colorToken = (value: string, cssProp: string): string | undefined => {
  const token = colorToToken(value, cssProp);
  return token ? `colors.${token}` : undefined;
};

const textColorRow = (cssValue: string): ElementStyleRow => {
  const hex = toHex(cssValue);
  return {
    label: i18n.translate('kbnDesignTools.fontInspect.card.textColor', {
      defaultMessage: 'Text color',
    }),
    cssValue: hex ?? cssValue,
    euiToken: colorToken(cssValue, 'color'),
    swatchColor: hex ?? undefined,
  };
};

const mapToken = (
  lookup: Map<number, string>,
  rawValue: string,
  prefix: string
): string | undefined => {
  const parsed = parseFloat(rawValue);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return undefined;
  }
  const key = lookup.get(parsed);
  return key ? `${prefix}.${key}` : undefined;
};

const shouldShowLetterSpacing = (letterSpacing: string): boolean => {
  if (letterSpacing === 'normal') {
    return false;
  }
  const value = parseFloat(letterSpacing);
  return Number.isFinite(value) && value !== 0;
};

/**
 * Resolves an element's computed typography and text color to EUI design
 */
export const useDesignTokenSections = (element: HTMLElement): ElementStyleSummary => {
  const fontWeightLookup = useEuiFontWeightLookup();
  const fontScaleLookup = useEuiFontScaleLookup();

  return useMemo(() => {
    const fontInfo = getFontInfo(element);
    const computed = getComputedStyle(element);
    const textColor = computed.color;

    const rows: ElementStyleRow[] = [
      {
        label: i18n.translate('kbnDesignTools.fontInspect.card.size', {
          defaultMessage: 'Size',
        }),
        cssValue: fontInfo.fontSize,
        euiToken: mapToken(fontScaleLookup, computed.fontSize, 'font.scale'),
      },
      {
        label: i18n.translate('kbnDesignTools.fontInspect.card.weight', {
          defaultMessage: 'Weight',
        }),
        cssValue: fontInfo.fontWeight,
        euiToken: mapToken(fontWeightLookup, computed.fontWeight, 'font.weight'),
      },
      {
        label: i18n.translate('kbnDesignTools.fontInspect.card.lineHeight', {
          defaultMessage: 'Line height',
        }),
        cssValue: fontInfo.lineHeight,
      },
    ];
    if (shouldShowLetterSpacing(fontInfo.letterSpacing)) {
      rows.push({
        label: i18n.translate('kbnDesignTools.fontInspect.card.letterSpacing', {
          defaultMessage: 'Letter spacing',
        }),
        cssValue: fontInfo.letterSpacing,
      });
    }
    rows.push(textColorRow(textColor));

    return {
      fontFamily: fontInfo.fontFamily,
      rows,
    };
  }, [element, fontWeightLookup, fontScaleLookup]);
};
