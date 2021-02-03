/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { enumeratePatterns } from './enumerate_patterns';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';

const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

describe(`enumeratePatterns`, () => {
  it(`should resolve x-pack/plugins/reporting/server/browsers/extract/unzip.js to kibana-reporting`, () => {
    const actual = enumeratePatterns(REPO_ROOT)(log)(
      new Map([['x-pack/plugins/reporting', ['kibana-reporting']]])
    );

    expect(
      actual[0].includes(
        'x-pack/plugins/reporting/server/browsers/extract/unzip.js kibana-reporting'
      )
    ).toBe(true);
  });
  it(`should resolve src/plugins/charts/public/static/color_maps/color_maps.ts to kibana-app`, () => {
    const actual = enumeratePatterns(REPO_ROOT)(log)(
      new Map([['src/plugins/charts/public/static/color_maps', ['kibana-app']]])
    );

    expect(actual[0][0]).toBe(
      'src/plugins/charts/public/static/color_maps/color_maps.ts kibana-app'
    );
  });
  it(`should resolve x-pack/plugins/security_solution/public/common/components/exceptions/builder/translations.ts to kibana-security`, () => {
    const short = 'x-pack/plugins/security_solution';
    const actual = enumeratePatterns(REPO_ROOT)(log)(new Map([[short, ['kibana-security']]]));

    expect(
      actual[0].includes(
        `${short}/public/common/components/exceptions/builder/translations.ts kibana-security`
      )
    ).toBe(true);
  });
});
