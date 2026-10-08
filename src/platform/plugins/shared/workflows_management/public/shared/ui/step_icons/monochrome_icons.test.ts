/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Coverage map for MonochromeIcons regressions:
 *
 * (i)  Over-masking a colored logo: tested below — if a logo like `.slack` or `elasticsearch`
 *      is added to MonochromeIcons, those `false` assertions fail immediately.
 *
 * (ii) Monochrome id wired to a bare EUI glyph name in CSS: tested below — if an id in
 *      MonochromeIcons maps to e.g. `'commandLine'` in HardcodedIconDataUrls, the check fails.
 *
 * NOT covered here (by design):
 *      A *missing* monochrome entry — a new black-fill glyph step added without a corresponding
 *      entry in MonochromeIcons. Jest stubs all SVG imports to 'test-file-stub', so fill-based
 *      detection is impossible. This gap is NOT closed by the shallow scout check in
 *      workflow_editor.spec.ts either. It relies on manual/visual dark-mode review.
 */

import { HardcodedIconDataUrls } from '@kbn/workflows-ui';
import { MonochromeIcons } from './monochrome_icons';

describe('MonochromeIcons', () => {
  // (i) Over-masking guard: colored logos must NEVER be in the monochrome set.
  // Masking a multi-color logo collapses it to a solid currentColor silhouette — wrong in any mode.
  it.each(['.slack', '.slack_api', 'elasticsearch', 'kibana'])(
    '"%s" is a colored logo and must NOT be in MonochromeIcons',
    (id) => {
      expect(MonochromeIcons.has(id)).toBe(false);
    }
  );

  // (ii) Name-in-CSS guard: every monochrome id that has a HardcodedIconDataUrls entry must
  // resolve to a data URL (or the Jest SVG stub), never a bare EUI glyph name string.
  // A bare name like 'commandLine' in a CSS url() renders nothing — the original bug.
  it('every MonochromeIcons entry with a HardcodedIconDataUrls value is a data URL (not a bare EUI name)', () => {
    const failures: string[] = [];
    for (const id of MonochromeIcons) {
      const value = HardcodedIconDataUrls[id];
      // Connector-only ids (.http, .gen-ai, .bedrock) have no entry in HardcodedIconDataUrls — skip.
      if (value !== undefined) {
        const isValid =
          typeof value !== 'string' || value === 'test-file-stub' || value.startsWith('data:');
        if (!isValid) {
          failures.push(
            `["${id}"] = "${String(value).slice(0, 60)}" (bare EUI name — invalid in CSS url())`
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
