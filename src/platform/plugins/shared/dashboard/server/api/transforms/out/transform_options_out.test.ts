/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformOptionsOut } from './transform_options_out';

describe('transformOptionsOut', () => {
  it('should not provide any defaults', () => {
    const optionsJSON = JSON.stringify({});
    const result = transformOptionsOut(optionsJSON);
    expect(result).toEqual({});
  });

  it('should pick only supported options', () => {
    const optionsJSON = JSON.stringify({
      hidePanelTitles: true,
      unsupportedOption: 'value',
    });
    const result = transformOptionsOut(optionsJSON);
    expect(result).toEqual({
      hide_panel_titles: true,
    });
    expect(result).not.toHaveProperty('unsupportedOption');
  });

  it('should translate all options', () => {
    const optionsJSON = JSON.stringify({
      hidePanelTitles: true,
      useMargins: true,
      syncColors: true,
      syncCursor: true,
      syncTooltips: true,
    });
    const result = transformOptionsOut(optionsJSON);
    expect(result).toEqual({
      hide_panel_titles: true,
      use_margins: true,
      sync_colors: true,
      sync_cursor: true,
      sync_tooltips: true,
    });
  });

  it('should handle invalid JSON gracefully', () => {
    const optionsJSON = 'invalid JSON';
    expect(() => transformOptionsOut(optionsJSON)).toThrow(SyntaxError);
  });
});
