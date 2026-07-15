/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyNumericFontFamily, ELASTIC_UI_NUMERIC_FONT_FAMILY } from './helpers';

describe('applyNumericFontFamily', () => {
  it('prepends the numeric font family to any fontFamily string', () => {
    const theme = {
      axes: {
        tickLabel: {
          fontFamily: 'Inter, sans-serif',
        },
      },
    };

    applyNumericFontFamily(theme);

    expect(theme.axes.tickLabel.fontFamily).toBe(
      `${ELASTIC_UI_NUMERIC_FONT_FAMILY}, Inter, sans-serif`
    );
  });

  it('does not double-prepend when already present', () => {
    const theme = {
      fontFamily: `${ELASTIC_UI_NUMERIC_FONT_FAMILY}, Inter, sans-serif`,
    };

    applyNumericFontFamily(theme);

    expect(theme.fontFamily).toBe(`${ELASTIC_UI_NUMERIC_FONT_FAMILY}, Inter, sans-serif`);
  });

  it('walks arrays and ignores non-record entries', () => {
    const theme = {
      series: [
        { label: { fontFamily: 'Inter' } },
        'skip-me',
        null,
        { label: { fontFamily: `${ELASTIC_UI_NUMERIC_FONT_FAMILY}, Inter` } },
      ],
    };

    applyNumericFontFamily(theme);

    expect(theme.series[0]).toEqual({
      label: { fontFamily: `${ELASTIC_UI_NUMERIC_FONT_FAMILY}, Inter` },
    });
    expect(theme.series[3]).toEqual({
      label: { fontFamily: `${ELASTIC_UI_NUMERIC_FONT_FAMILY}, Inter` },
    });
  });
});
