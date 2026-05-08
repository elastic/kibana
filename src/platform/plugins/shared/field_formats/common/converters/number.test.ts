/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NumberFormat } from './number';
import { FORMATS_UI_SETTINGS } from '../constants/ui_settings';
import { NULL_LABEL } from '@kbn/field-formats-common';
import { HTML_CONTEXT_TYPE, TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementAsArray } from '../test_utils';

describe('NumberFormat', () => {
  const config: { [key: string]: string } = {
    [FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN]: '0,0.[000]',
  };

  const getConfig = (key: string) => config[key];

  test('default pattern', () => {
    const formatter = new NumberFormat({}, getConfig);

    expect(formatter.convert(12.345678, TEXT_CONTEXT_TYPE)).toBe('12.346');
    expect(formatter.convert(12.345678, HTML_CONTEXT_TYPE)).toBe('12.346');
    expect(formatter.reactConvert(12.345678)).toBe('12.346');
  });

  test('custom pattern', () => {
    const formatter = new NumberFormat({ pattern: '0,0' }, getConfig);

    expect(formatter.convert('12.345678', TEXT_CONTEXT_TYPE)).toBe('12');
    expect(formatter.convert('12.345678', HTML_CONTEXT_TYPE)).toBe('12');
    expect(formatter.reactConvert('12.345678')).toBe('12');
  });

  test('object input', () => {
    const formatter = new NumberFormat({}, getConfig);
    expect(
      formatter.convert({ min: 150, max: 1000, sum: 5000, value_count: 10 }, TEXT_CONTEXT_TYPE)
    ).toMatchInlineSnapshot(`"{\\"min\\":150,\\"max\\":1000,\\"sum\\":5000,\\"value_count\\":10}"`);
    expect(
      formatter.convert({ min: 150, max: 1000, sum: 5000, value_count: 10 }, HTML_CONTEXT_TYPE)
    ).toMatchInlineSnapshot(`
      "{
        &quot;min&quot;: 150,
        &quot;max&quot;: 1000,
        &quot;sum&quot;: 5000,
        &quot;value_count&quot;: 10
      }"
    `);
    expect(formatter.reactConvert({ min: 150, max: 1000, sum: 5000, value_count: 10 }))
      .toMatchInlineSnapshot(`
      "{
        \\"min\\": 150,
        \\"max\\": 1000,
        \\"sum\\": 5000,
        \\"value_count\\": 10
      }"
    `);
  });

  test('object input stringified', () => {
    const formatter = new NumberFormat({}, getConfig);
    expect(
      formatter.convert(
        '{"min":-302.5,"max":702.3,"sum":200.0,"value_count":25}',
        TEXT_CONTEXT_TYPE
      )
    ).toMatchInlineSnapshot(
      `"{\\"min\\":-302.5,\\"max\\":702.3,\\"sum\\":200.0,\\"value_count\\":25}"`
    );
    expect(
      formatter.convert(
        '{"min":-302.5,"max":702.3,"sum":200.0,"value_count":25}',
        HTML_CONTEXT_TYPE
      )
    ).toMatchInlineSnapshot(
      `"{&quot;min&quot;:-302.5,&quot;max&quot;:702.3,&quot;sum&quot;:200.0,&quot;value_count&quot;:25}"`
    );
    expect(
      formatter.reactConvert('{"min":-302.5,"max":702.3,"sum":200.0,"value_count":25}')
    ).toMatchInlineSnapshot(
      `"{\\"min\\":-302.5,\\"max\\":702.3,\\"sum\\":200.0,\\"value_count\\":25}"`
    );
  });

  test('null input', () => {
    const formatter = new NumberFormat({}, getConfig);
    expect(formatter.convert(null, TEXT_CONTEXT_TYPE)).toMatchInlineSnapshot(`"${NULL_LABEL}"`);
    expect(formatter.convert(null, HTML_CONTEXT_TYPE)).toMatchInlineSnapshot(
      `"<span class=\\"ffString__emptyValue\\">${NULL_LABEL}</span>"`
    );
    expectReactElementWithNull(formatter.reactConvert(null));
  });

  test('escapes HTML characters in html context', () => {
    const formatter = new NumberFormat({}, getConfig);
    const objWithHtml = { value: '<script>alert("test")</script>' };
    expect(formatter.convert(objWithHtml, HTML_CONTEXT_TYPE)).toBe(
      '{\n  &quot;value&quot;: &quot;&lt;script&gt;alert(\\&quot;test\\&quot;)&lt;/script&gt;&quot;\n}'
    );
    expect(formatter.reactConvert(objWithHtml)).toBe(
      '{\n  "value": "<script>alert(\\"test\\")</script>"\n}'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    const formatter = new NumberFormat({ pattern: '0,0' }, getConfig);

    expect(formatter.convert([1000, 2000], TEXT_CONTEXT_TYPE)).toBe('["1,000","2,000"]');
    expect(formatter.convert([1000, 2000], HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffArray__highlight">[</span>1,000<span class="ffArray__highlight">,</span> 2,000<span class="ffArray__highlight">]</span>'
    );
    expectReactElementAsArray(formatter.reactConvert([1000, 2000]), ['1,000', '2,000']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const formatter = new NumberFormat({ pattern: '0,0' }, getConfig);

    expect(formatter.convert([1000], TEXT_CONTEXT_TYPE)).toBe('["1,000"]');
    expect(formatter.convert([1000], HTML_CONTEXT_TYPE)).toBe('1,000');
    expect(formatter.reactConvert([1000])).toBe('1,000');
  });
});
