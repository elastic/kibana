/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldFormat } from '../field_format';
import { asPrettyString } from '../utils';
import type { HtmlContextTypeConvert, TextContextTypeConvert } from '../types';

const createFormat = (htmlConvert?: (...args: unknown[]) => string) =>
  new (class TestFormat extends FieldFormat {
    static id = 'test-html-content';
    static title = 'Test HTML Content';
    textConvert: TextContextTypeConvert = (val) => asPrettyString(val);
    htmlConvert: HtmlContextTypeConvert | undefined = htmlConvert as
      | HtmlContextTypeConvert
      | undefined;
  })({}, jest.fn());

describe('html_content_type setup', () => {
  test('does not throw when array contains non-string values from ignored_field_values', () => {
    const format = createFormat();
    const result = format.convert(['valid', true, { message: 'error' }], 'html');
    expect(result).toMatchInlineSnapshot(`
      "<span class=\\"ffArray__highlight\\">[</span>
        valid<span class=\\"ffArray__highlight\\">,</span>
        true<span class=\\"ffArray__highlight\\">,</span>
        {
          &quot;message&quot;: &quot;error&quot;
        }
      <span class=\\"ffArray__highlight\\">]</span>"
    `);
  });

  test('does not throw when custom htmlConvert returns a non-string', () => {
    const format = createFormat(() => true as unknown as string);
    const result = format.convert([1, 2], 'html');
    expect(result).toMatchInlineSnapshot(
      `"<span class=\\"ffArray__highlight\\">[</span>true<span class=\\"ffArray__highlight\\">,</span> true<span class=\\"ffArray__highlight\\">]</span>"`
    );
  });
});
