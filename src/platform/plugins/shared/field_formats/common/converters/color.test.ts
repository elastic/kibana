/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { ColorFormat } from './color';
import { HTML_CONTEXT_TYPE, TEXT_CONTEXT_TYPE } from '../content_types';
import { expectReactElementWithNull, expectReactElementWithBlank } from '../test_utils';

const expectColoredReactElement = (
  element: React.ReactNode,
  text: string | number,
  color: string,
  backgroundColor: string
) => {
  const el = element as ReactElement;
  expect(el.type).toBe('span');
  expect(el.props.style).toEqual({
    color,
    backgroundColor,
    display: 'inline-block',
    padding: '0 8px',
    borderRadius: '3px',
  });
  expect(el.props.children).toBe(String(text));
};

describe('Color Format', () => {
  const checkResult = (text: string | number, color: string, backgroundColor: string) =>
    `<span style="color:${color};background-color:${backgroundColor};display:inline-block;padding:0 8px;border-radius:3px">${text}</span>`;

  const checkMissingValues = (colorer: ColorFormat) => {
    expect(colorer.convert(null, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(colorer.convert(undefined, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(colorer.convert('', HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(blank)</span>'
    );
    expect(colorer.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(colorer.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(colorer.convert('', TEXT_CONTEXT_TYPE)).toBe('(blank)');
    expectReactElementWithNull(colorer.reactConvert(null));
    expectReactElementWithNull(colorer.reactConvert(undefined));
    expectReactElementWithBlank(colorer.reactConvert(''));
  };

  describe('field is a number', () => {
    test('should add colors if the value is in range', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'number',
          colors: [
            {
              range: '100:150',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );

      expect(colorer.convert(99, HTML_CONTEXT_TYPE)).toBe('99');
      expect(colorer.convert(100, HTML_CONTEXT_TYPE)).toBe(checkResult(100, 'blue', 'yellow'));
      expect(colorer.convert(150, HTML_CONTEXT_TYPE)).toBe(checkResult(150, 'blue', 'yellow'));
      expect(colorer.convert(151, HTML_CONTEXT_TYPE)).toBe('151');

      expect(colorer.reactConvert(99)).toBe('99');
      expectColoredReactElement(colorer.reactConvert(100), 100, 'blue', 'yellow');
      expectColoredReactElement(colorer.reactConvert(150), 150, 'blue', 'yellow');
      expect(colorer.reactConvert(151)).toBe('151');

      checkMissingValues(colorer);
    });

    test('should not convert invalid ranges', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'number',
          colors: [
            {
              range: '100150',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );

      expect(colorer.convert(99, HTML_CONTEXT_TYPE)).toBe('99');
      expect(colorer.reactConvert(99)).toBe('99');
    });
  });

  describe('field is a boolean', () => {
    test('should add colors if the value is true or false', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'boolean',
          colors: [
            {
              boolean: 'true',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );

      expect(colorer.convert(true, HTML_CONTEXT_TYPE)).toBe(checkResult('true', 'blue', 'yellow'));
      expect(colorer.convert(false, HTML_CONTEXT_TYPE)).toBe('false');

      expectColoredReactElement(colorer.reactConvert(true), 'true', 'blue', 'yellow');
      expect(colorer.reactConvert(false)).toBe('false');

      checkMissingValues(colorer);
    });
  });

  describe('field is a string', () => {
    test('should add colors if the regex matches', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'string',
          colors: [
            {
              regex: 'A.*',
              text: 'white',
              background: 'red',
            },
          ],
        },
        jest.fn()
      );
      const converter = colorer.getConverterFor(HTML_CONTEXT_TYPE) as Function;

      expect(converter('B', HTML_CONTEXT_TYPE)).toBe('B');
      expect(converter('AAA', HTML_CONTEXT_TYPE)).toBe(checkResult('AAA', 'white', 'red'));
      expect(converter('AB', HTML_CONTEXT_TYPE)).toBe(checkResult('AB', 'white', 'red'));
      expect(converter('AB <', HTML_CONTEXT_TYPE)).toBe(checkResult('AB &lt;', 'white', 'red'));
      expect(converter('a', HTML_CONTEXT_TYPE)).toBe('a');

      expect(colorer.reactConvert('B')).toBe('B');
      expectColoredReactElement(colorer.reactConvert('AAA'), 'AAA', 'white', 'red');
      expectColoredReactElement(colorer.reactConvert('AB'), 'AB', 'white', 'red');
      expectColoredReactElement(colorer.reactConvert('AB <'), 'AB <', 'white', 'red');
      expect(colorer.reactConvert('a')).toBe('a');

      checkMissingValues(colorer);
    });

    test('returns original value (escaped) when regex is invalid', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'string',
          colors: [
            {
              regex: 'A.*',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );
      const converter = colorer.getConverterFor(HTML_CONTEXT_TYPE) as Function;

      expect(converter('<', HTML_CONTEXT_TYPE)).toBe('&lt;');
      expect(colorer.reactConvert('<')).toBe('<');

      checkMissingValues(colorer);
    });

    test('returns original value (escaped) on regex with syntax error', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'string',
          colors: [
            {
              regex: 'nogroup(',
              text: 'blue',
              background: 'yellow',
            },
          ],
        },
        jest.fn()
      );
      const converter = colorer.getConverterFor(HTML_CONTEXT_TYPE) as Function;

      expect(converter('<', HTML_CONTEXT_TYPE)).toBe('&lt;');
      expect(colorer.reactConvert('<')).toBe('<');
    });
  });

  test('wraps a multi-value array with bracket notation', () => {
    const colorer = new ColorFormat(
      { fieldType: 'number', colors: [{ range: '0:200', text: 'blue', background: 'yellow' }] },
      jest.fn()
    );

    expect(colorer.convert([100, 200], TEXT_CONTEXT_TYPE)).toBe('["100","200"]');
    expect(colorer.convert([100, 200], HTML_CONTEXT_TYPE)).toBe(
      `<span class="ffArray__highlight">[</span>${checkResult(
        100,
        'blue',
        'yellow'
      )}<span class="ffArray__highlight">,</span> ${checkResult(
        200,
        'blue',
        'yellow'
      )}<span class="ffArray__highlight">]</span>`
    );
    expect(colorer.reactConvert([100, 200])).toMatchInlineSnapshot(`
      <React.Fragment>
        <span
          className="ffArray__highlight"
        >
          [
        </span>
        <span
          style={
            Object {
              "backgroundColor": "yellow",
              "borderRadius": "3px",
              "color": "blue",
              "display": "inline-block",
              "padding": "0 8px",
            }
          }
        >
          100
        </span>
        <span
          className="ffArray__highlight"
        >
          ,
        </span>
         
        <span
          style={
            Object {
              "backgroundColor": "yellow",
              "borderRadius": "3px",
              "color": "blue",
              "display": "inline-block",
              "padding": "0 8px",
            }
          }
        >
          200
        </span>
        <span
          className="ffArray__highlight"
        >
          ]
        </span>
      </React.Fragment>
    `);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const colorer = new ColorFormat(
      { fieldType: 'number', colors: [{ range: '0:200', text: 'blue', background: 'yellow' }] },
      jest.fn()
    );

    expect(colorer.convert([100], TEXT_CONTEXT_TYPE)).toBe('["100"]');
    expect(colorer.convert([100], HTML_CONTEXT_TYPE)).toBe(checkResult(100, 'blue', 'yellow'));
    expectColoredReactElement(colorer.reactConvert([100]), 100, 'blue', 'yellow');
  });
});
