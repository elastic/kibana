/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ColorFormat } from './color';
import { TEXT_CONTEXT_TYPE } from '../content_types';

describe('Color Format', () => {
  const checkMissingValues = (colorer: ColorFormat) => {
    expect(colorer.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(colorer.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(colorer.convert('', TEXT_CONTEXT_TYPE)).toBe('(blank)');
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

      // Test text conversion (no color)
      expect(colorer.convert(99)).toBe('99');
      expect(colorer.convert(100)).toBe('100');
      expect(colorer.convert(151)).toBe('151');

      // Test React conversion for colored values
      const result100 = colorer.convertToReact(100);
      const { container: container100 } = render(<>{result100}</>);
      expect(container100.textContent).toBe('100');
      expect(container100.querySelector('span')).toHaveStyle({
        color: 'blue',
        backgroundColor: 'yellow',
      });

      const result150 = colorer.convertToReact(150);
      const { container: container150 } = render(<>{result150}</>);
      expect(container150.textContent).toBe('150');
      expect(container150.querySelector('span')).toHaveStyle({
        color: 'blue',
        backgroundColor: 'yellow',
      });

      // Values out of range should not have styled span
      const result99 = colorer.convertToReact(99);
      const { container: container99 } = render(<>{result99}</>);
      expect(container99.textContent).toBe('99');

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

      expect(colorer.convert(99)).toBe('99');
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

      // Test React conversion
      const resultTrue = colorer.convertToReact(true);
      const { container: containerTrue } = render(<>{resultTrue}</>);
      expect(containerTrue.textContent).toBe('true');
      expect(containerTrue.querySelector('span')).toHaveStyle({
        color: 'blue',
        backgroundColor: 'yellow',
      });

      const resultFalse = colorer.convertToReact(false);
      const { container: containerFalse } = render(<>{resultFalse}</>);
      expect(containerFalse.textContent).toBe('false');

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

      // Test React conversion
      const resultB = colorer.convertToReact('B');
      const { container: containerB } = render(<>{resultB}</>);
      expect(containerB.textContent).toBe('B');

      const resultAAA = colorer.convertToReact('AAA');
      const { container: containerAAA } = render(<>{resultAAA}</>);
      expect(containerAAA.textContent).toBe('AAA');
      expect(containerAAA.querySelector('span')).toHaveStyle({
        color: 'white',
        backgroundColor: 'red',
      });

      const resultAB = colorer.convertToReact('AB');
      const { container: containerAB } = render(<>{resultAB}</>);
      expect(containerAB.textContent).toBe('AB');
      expect(containerAB.querySelector('span')).toHaveStyle({
        color: 'white',
        backgroundColor: 'red',
      });

      const resultLowerA = colorer.convertToReact('a');
      const { container: containerLowerA } = render(<>{resultLowerA}</>);
      expect(containerLowerA.textContent).toBe('a');

      // Test with special characters - React handles escaping
      const resultSpecial = colorer.convertToReact('AB <');
      const { container: containerSpecial } = render(<>{resultSpecial}</>);
      expect(containerSpecial.textContent).toBe('AB <');
      expect(containerSpecial.querySelector('span')).toHaveStyle({
        color: 'white',
        backgroundColor: 'red',
      });

      checkMissingValues(colorer);
    });

    test('returns original value when regex does not match', () => {
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

      const result = colorer.convertToReact('<');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('<');

      checkMissingValues(colorer);
    });

    test('returns original value on regex with syntax error', () => {
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

      const result = colorer.convertToReact('<');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('<');
    });
  });

  describe('htmlConvert', () => {
    test('throws an error', () => {
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

      expect(() => colorer.convert('test', 'html')).toThrow(
        'ColorFormat does not support HTML rendering'
      );
    });
  });

  describe('fieldType inference from value', () => {
    test('should infer string type from string value when fieldType is not set', () => {
      const colorer = new ColorFormat(
        {
          colors: [
            {
              regex: 'CN',
              text: 'white',
              background: 'red',
            },
          ],
        },
        jest.fn()
      );

      const result = colorer.convertToReact('CN');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('CN');
      expect(container.querySelector('span')).toHaveStyle({
        color: 'white',
        backgroundColor: 'red',
      });
    });

    test('should infer number type from number value when fieldType is not set', () => {
      const colorer = new ColorFormat(
        {
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

      const result = colorer.convertToReact(125);
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('125');
      expect(container.querySelector('span')).toHaveStyle({
        color: 'blue',
        backgroundColor: 'yellow',
      });
    });

    test('should infer boolean type from boolean value when fieldType is not set', () => {
      const colorer = new ColorFormat(
        {
          colors: [
            {
              boolean: 'true',
              text: 'green',
              background: 'white',
            },
          ],
        },
        jest.fn()
      );

      const result = colorer.convertToReact(true);
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('true');
      expect(container.querySelector('span')).toHaveStyle({
        color: 'green',
        backgroundColor: 'white',
      });
    });

    test('explicit fieldType should take precedence over inferred type', () => {
      const colorer = new ColorFormat(
        {
          fieldType: 'number',
          colors: [
            {
              range: '100:150',
              text: 'blue',
              background: 'yellow',
            },
            {
              regex: '.*',
              text: 'red',
              background: 'black',
            },
          ],
        },
        jest.fn()
      );

      const result = colorer.convertToReact('CN');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('CN');
      expect(container.querySelector('span')).toBeNull();
    });
  });
});
