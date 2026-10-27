/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluateKql } from './eval_kql';
import {
  decodeKqlTemplateValues,
  encodeKqlTemplateValue,
  parseKqlTemplate,
} from './kql_template_values';

const evaluateTemplate = (
  build: (encode: typeof encodeKqlTemplateValue) => string,
  context: Record<string, unknown>
): boolean => evaluateKql(parseKqlTemplate(build(encodeKqlTemplateValue)), context);

describe('kql template values', () => {
  describe('encodeKqlTemplateValue / decodeKqlTemplateValues', () => {
    it.each([
      ['plain', 'plain'],
      ['empty', ''],
      ['KQL syntax', 'a or b: (c) "d" * \\ not e'],
      ['newline', 'line1\nline2'],
      ['unicode', 'žółć 🚀'],
      ['leading byte order mark', '\uFEFFabc'],
      ['token lookalike', '__wftpl_61_'],
    ])('round-trips %s', (_name, value) => {
      const token = encodeKqlTemplateValue(value);
      expect(token).toMatch(/^[a-z0-9_]+$/);
      expect(decodeKqlTemplateValues(`x ${token} y`)).toBe(`x ${value} y`);
    });

    it('does not decode twice', () => {
      expect(decodeKqlTemplateValues(encodeKqlTemplateValue(encodeKqlTemplateValue('a')))).toBe(
        encodeKqlTemplateValue('a')
      );
    });

    it.each([
      [null, ''],
      [undefined, ''],
      [42, '42'],
      [true, 'true'],
      [['a', 'b'], 'ab'],
    ])('stringifies %p like Liquid', (value, expected) => {
      expect(decodeKqlTemplateValues(encodeKqlTemplateValue(value))).toBe(expected);
    });

    it('leaves malformed tokens untouched', () => {
      expect(decodeKqlTemplateValues('__wftpl_abc_')).toBe('__wftpl_abc_');
    });
  });

  describe('parseKqlTemplate', () => {
    const context = { consts: { secret: 's3' } };

    it.each([
      ['wrong', false],
      ['s3', true],
      ['wrong or consts.secret: s3', false],
      ['wrong or not consts.secret: x', false],
      ['*', false],
      ['s3 or x', false],
    ])('treats injected value %p as a literal (match: %p)', (guess, expected) => {
      expect(evaluateTemplate((encode) => `consts.secret: ${encode(guess)}`, context)).toBe(
        expected
      );
    });

    it('does not treat a value with a leading byte order mark as its stripped text', () => {
      expect(evaluateTemplate((encode) => `consts.secret: ${encode('\uFEFFs3')}`, context)).toBe(
        false
      );
    });

    it('matches values containing KQL syntax literally', () => {
      expect(
        evaluateTemplate((encode) => `title: ${encode('a or b: (c)')}`, { title: 'a or b: (c)' })
      ).toBe(true);
    });

    it('supports quoted values', () => {
      expect(
        evaluateTemplate((encode) => `title: "${encode('x" or y')}"`, { title: 'x" or y' })
      ).toBe(true);
    });

    it('supports values embedded in a larger term', () => {
      expect(evaluateTemplate((encode) => `host: web-${encode('01')}`, { host: 'web-01' })).toBe(
        true
      );
    });

    it('supports an empty value', () => {
      expect(evaluateTemplate((encode) => `name: ${encode('')}`, { name: '' })).toBe(true);
      expect(evaluateTemplate((encode) => `name: ${encode('')}`, { name: 'x' })).toBe(false);
    });

    it('supports the value as a field name', () => {
      expect(
        evaluateTemplate((encode) => `${encode('user.name')}: bob`, { user: { name: 'bob' } })
      ).toBe(true);
    });

    it('supports numbers in range comparisons', () => {
      expect(evaluateTemplate((encode) => `count > ${encode(3)}`, { count: 5 })).toBe(true);
      expect(evaluateTemplate((encode) => `count > ${encode(7)}`, { count: 5 })).toBe(false);
    });

    it('keeps author-written wildcards working', () => {
      expect(evaluateTemplate((encode) => `host: ${encode('web')}*`, { host: 'web-01' })).toBe(
        true
      );
    });

    it('does not let a templated value act as a wildcard', () => {
      expect(evaluateTemplate((encode) => `host: ${encode('web*')}`, { host: 'web-01' })).toBe(
        false
      );
      expect(evaluateTemplate((encode) => `host: ${encode('web*')}`, { host: 'web*' })).toBe(true);
      expect(evaluateTemplate((encode) => `host: ${encode('*')}x*`, { host: 'ax' })).toBe(false);
    });

    it('fails closed when a templated value carries the internal wildcard marker', () => {
      expect(() =>
        parseKqlTemplate(`host: ${encodeKqlTemplateValue('@kuery-wildcard@')}*`)
      ).toThrow('wildcards');
    });

    it('still throws a syntax error for invalid author-written KQL', () => {
      expect(() => parseKqlTemplate(`a: (${encodeKqlTemplateValue('x')}`)).toThrow();
    });
  });
});
