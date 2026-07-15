/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { USES_STYLED_COMPONENTS, usesStyledComponents } from './styled_components_files';

describe('USES_STYLED_COMPONENTS', () => {
  it('is an array of RegExp', () => {
    expect(Array.isArray(USES_STYLED_COMPONENTS)).toBe(true);
    expect(USES_STYLED_COMPONENTS.length).toBeGreaterThan(0);
    for (const pattern of USES_STYLED_COMPONENTS) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });

  it('matches known styled-components paths', () => {
    expect(
      USES_STYLED_COMPONENTS.some((re: RegExp) =>
        re.test('src/platform/packages/private/kbn-ui-shared-deps-npm/src/entry.js')
      )
    ).toBe(true);
  });

  it('does not match unrelated paths', () => {
    expect(
      USES_STYLED_COMPONENTS.some((re: RegExp) => re.test('src/plugins/my_plugin/public/app.tsx'))
    ).toBe(false);
  });

  it('is reference-equal to babel-preset styled_components_files export', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const babelPresetExport = require('@kbn/babel-preset/styled_components_files');
    expect(USES_STYLED_COMPONENTS).toBe(babelPresetExport.USES_STYLED_COMPONENTS);
  });
});

describe('usesStyledComponents', () => {
  it('returns true for a matching path', () => {
    expect(
      usesStyledComponents('src/platform/packages/private/kbn-ui-shared-deps-npm/src/entry.js')
    ).toBe(true);
  });

  it('returns false for an unrelated path', () => {
    expect(usesStyledComponents('src/plugins/dashboard/public/app.tsx')).toBe(false);
  });

  it('normalizes backslashes for Windows paths', () => {
    const forwardSlashResult = usesStyledComponents(
      'src/platform/packages/private/kbn-ui-shared-deps-npm/src/entry.js'
    );
    const backslashResult = usesStyledComponents(
      'src\\platform\\packages\\private\\kbn-ui-shared-deps-npm\\src\\entry.js'
    );
    expect(backslashResult).toBe(forwardSlashResult);
  });
});
