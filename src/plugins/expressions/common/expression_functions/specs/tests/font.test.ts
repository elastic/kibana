/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { openSans } from '../../../fonts';
import { font } from '../font';
import { functionWrapper } from './utils';

describe('font', () => {
  const fn = functionWrapper(font);

  const args = {
    align: 'left',
    color: null,
    family: openSans.value,
    italic: false,
    lHeight: null,
    size: 14,
    underline: false,
    weight: 'normal',
  };

  describe('default output', () => {
    const result = fn(null, args);

    it('returns a style', () => {
      expect(result).toMatchObject({
        type: 'style',
        spec: expect.any(Object),
        css: expect.any(String),
      });
    });
  });

  describe('args', () => {
    describe('size', () => {
      it('sets font size', () => {
        const result = fn(null, { ...args, size: 20 });
        expect(result).toMatchObject({
          spec: {
            fontSize: '20px',
          },
        });
        expect(result.css).toContain('font-size:20px');
      });
    });

    describe('lHeight', () => {
      it('sets line height', () => {
        const result = fn(null, { ...args, lHeight: 30 });
        expect(result).toMatchObject({
          spec: {
            lineHeight: '30px',
          },
        });
        expect(result.css).toContain('line-height:30px');
      });
    });

    describe('family', () => {
      it('sets font family', () => {
        const result = fn(null, { ...args, family: 'Optima, serif' });
        expect(result.spec.fontFamily).toBe('Optima, serif');
        expect(result.css).toContain('font-family:Optima, serif');
      });
    });

    describe('color', () => {
      it('sets font color', () => {
        const result = fn(null, { ...args, color: 'blue' });
        expect(result.spec.color).toBe('blue');
        expect(result.css).toContain('color:blue');
      });
    });

    describe('weight', () => {
      it('sets font weight', () => {
        let result = fn(null, { ...args, weight: 'normal' });
        expect(result.spec.fontWeight).toBe('normal');
        expect(result.css).toContain('font-weight:normal');

        result = fn(null, { ...args, weight: 'bold' });
        expect(result.spec.fontWeight).toBe('bold');
        expect(result.css).toContain('font-weight:bold');

        result = fn(null, { ...args, weight: 'bolder' });
        expect(result.spec.fontWeight).toBe('bolder');
        expect(result.css).toContain('font-weight:bolder');

        result = fn(null, { ...args, weight: 'lighter' });
        expect(result.spec.fontWeight).toBe('lighter');
        expect(result.css).toContain('font-weight:lighter');

        result = fn(null, { ...args, weight: '400' });
        expect(result.spec.fontWeight).toBe('400');
        expect(result.css).toContain('font-weight:400');
      });

      it('throws when provided an invalid weight', () => {
        expect(() => fn(null, { ...args, weight: 'foo' })).toThrow();
      });
    });

    describe('underline', () => {
      it('sets text underline', () => {
        let result = fn(null, { ...args, underline: true });
        expect(result.spec.textDecoration).toBe('underline');
        expect(result.css).toContain('text-decoration:underline');

        result = fn(null, { ...args, underline: false });
        expect(result.spec.textDecoration).toBe('none');
        expect(result.css).toContain('text-decoration:none');
      });
    });

    describe('italic', () => {
      it('sets italic', () => {
        let result = fn(null, { ...args, italic: true });
        expect(result.spec.fontStyle).toBe('italic');
        expect(result.css).toContain('font-style:italic');

        result = fn(null, { ...args, italic: false });
        expect(result.spec.fontStyle).toBe('normal');
        expect(result.css).toContain('font-style:normal');
      });
    });

    describe('align', () => {
      it('sets text alignment', () => {
        let result = fn(null, { ...args, align: 'left' });
        expect(result.spec.textAlign).toBe('left');
        expect(result.css).toContain('text-align:left');

        result = fn(null, { ...args, align: 'center' });
        expect(result.spec.textAlign).toBe('center');
        expect(result.css).toContain('text-align:center');

        result = fn(null, { ...args, align: 'right' });
        expect(result.spec.textAlign).toBe('right');
        expect(result.css).toContain('text-align:right');

        result = fn(null, { ...args, align: 'justify' });
        expect(result.spec.textAlign).toBe('justify');
        expect(result.css).toContain('text-align:justify');
      });

      it('throws when provided an invalid alignment', () => {
        expect(() => fn(null, { ...args, align: 'foo' })).toThrow();
      });
    });
  });
});
