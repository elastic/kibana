/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformOptionsOut } from './transform_options_out';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../../../../common/content_management';

describe('transformOptionsOut', () => {
  it('should parse JSON and set default options', () => {
    const optionsJSON = JSON.stringify({});
    const result = transformOptionsOut(optionsJSON);
    expect(result).toEqual(DEFAULT_DASHBOARD_OPTIONS);
  });

  it('should override default options with provided options', () => {
    const optionsJSON = JSON.stringify({ hidePanelTitles: true });
    const result = transformOptionsOut(optionsJSON);
    expect(result).toEqual({
      ...DEFAULT_DASHBOARD_OPTIONS,
      hidePanelTitles: true,
    });
  });

  it('should pick only supported options', () => {
    const optionsJSON = JSON.stringify({
      hidePanelTitles: true,
      unsupportedOption: 'value',
    });
    const result = transformOptionsOut(optionsJSON);
    expect(result).toEqual({
      ...DEFAULT_DASHBOARD_OPTIONS,
      hidePanelTitles: true,
    });
    expect(result).not.toHaveProperty('unsupportedOption');
  });

  it('should handle invalid JSON gracefully', () => {
    const optionsJSON = 'invalid JSON';
    expect(() => transformOptionsOut(optionsJSON)).toThrow(SyntaxError);
  });
});
