/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractOptions } from './extract_options';

describe('extractOptions', () => {
  test('should extract options from options key', () => {
    expect(extractOptions({ options: { hide_panel_titles: true } })).toMatchInlineSnapshot(`
      Object {
        "hide_panel_titles": true,
      }
    `);
  });

  test('should extract options from top level keys', () => {
    expect(extractOptions({ hidePanelTitles: true })).toMatchInlineSnapshot(`
      Object {
        "hide_panel_titles": true,
      }
    `);
  });
});
