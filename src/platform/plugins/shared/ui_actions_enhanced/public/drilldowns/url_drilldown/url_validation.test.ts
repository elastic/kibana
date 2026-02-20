/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateUrlTemplate } from './url_validation';

describe('validateUrlTemplate', () => {
  test('domain in variable is allowed', async () => {
    expect(
      (await validateUrlTemplate('{{kibanaUrl}}/test', { kibanaUrl: 'http://localhost:5601/app' }))
        .isValid
    ).toBe(true);
  });

  test('unsafe domain in variable is not allowed', async () => {
    expect(
      (
        await validateUrlTemplate(
          '{{kibanaUrl}}/test',
          // eslint-disable-next-line no-script-url
          { kibanaUrl: 'javascript:evil()' }
        )
      ).isValid
    ).toBe(false);
  });

  test('if missing variable then invalid', async () => {
    expect(
      (await validateUrlTemplate('{{url}}/test', { kibanaUrl: 'http://localhost:5601/app' }))
        .isValid
    ).toBe(false);
  });
});
