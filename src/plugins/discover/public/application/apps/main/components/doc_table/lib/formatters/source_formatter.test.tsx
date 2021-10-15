/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatSource } from './source_formatter';
import { hit, indexPattern } from './mocks';

describe('_source formatter', () => {
  it('should format properly', () => {
    const element = formatSource({ hit, indexPattern, isShortDots: true, maxHeight: 115 });
    expect(element).toMatchInlineSnapshot(`
      <TemplateComponent
        defPairs={
          Array [
            Array [
              "also",
              "with \\"quotes\\" or 'single quotes'",
            ],
            Array [
              "foo",
              "bar",
            ],
            Array [
              "hello",
              "<h1>World</h1>",
            ],
            Array [
              "number",
              42,
            ],
          ]
        }
        maxHeight={115}
      />
    `);
  });
});
