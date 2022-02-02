/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { enumeratePatterns } from '../team_assignment/enumerate_patterns';
import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

const log = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});

describe(`enumeratePatterns`, () => {
  it(`should resolve x-pack/plugins/screenshotting/server/browsers/extract/unzip.ts to kibana-screenshotting`, () => {
    const actual = enumeratePatterns(REPO_ROOT)(log)(
      new Map([['x-pack/plugins/screenshotting', ['kibana-screenshotting']]])
    );

    expect(actual).toHaveProperty(
      '0',
      expect.arrayContaining([
        'x-pack/plugins/screenshotting/server/browsers/extract/unzip.ts kibana-screenshotting',
      ])
    );
  });
  it(`should resolve src/plugins/charts/common/static/color_maps/color_maps.ts to kibana-app`, () => {
    const actual = enumeratePatterns(REPO_ROOT)(log)(
      new Map([['src/plugins/charts/common/static/color_maps', ['kibana-app']]])
    );

    expect(actual[0][0]).toBe(
      'src/plugins/charts/common/static/color_maps/color_maps.ts kibana-app'
    );
  });
  it(`should resolve x-pack/plugins/security_solution/public/common/components/exceptions/edit_exception_flyout/translations.ts to kibana-security`, () => {
    const short = 'x-pack/plugins/security_solution';
    const actual = enumeratePatterns(REPO_ROOT)(log)(new Map([[short, ['kibana-security']]]));

    expect(
      actual[0].includes(
        `${short}/public/common/components/exceptions/edit_exception_flyout/translations.ts kibana-security`
      )
    ).toBe(true);
  });
});
