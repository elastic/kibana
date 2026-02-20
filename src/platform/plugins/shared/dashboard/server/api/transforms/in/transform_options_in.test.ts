/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformOptionsIn } from './transform_options_in';

describe('transformOptionsIn', () => {
  it('should not provide any defaults', () => {
    const apiOptions = undefined;
    const result = transformOptionsIn(apiOptions);
    expect(result).toEqual(JSON.stringify({}));
  });

  it('should pick only supported options', () => {
    const apiOptions = { foo: false, hide_panel_titles: true };
    const result = transformOptionsIn(apiOptions);
    expect(result).toEqual(
      JSON.stringify({
        hidePanelTitles: true,
      })
    );
    expect(result.indexOf('foo')).toBe(-1);
  });

  it('should translate all options', () => {
    const apiOptions = {
      hide_panel_titles: true,
      use_margins: false,
      sync_colors: true,
      sync_cursor: true,
      sync_tooltips: true,
    };
    const result = transformOptionsIn(apiOptions);
    const parsedResult = JSON.parse(result);
    expect(parsedResult.hidePanelTitles).toBe(true);
    expect(parsedResult.syncColors).toBe(true);
    expect(parsedResult.syncCursor).toBe(true);
    expect(parsedResult.syncTooltips).toBe(true);
    expect(parsedResult.useMargins).toBe(false);
  });
});
