/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { openSans } from '../../../fonts';
import { FontWeight, TextAlignment } from '../../../types';
import { font, FontArguments } from '../font';
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
  } as unknown as FontArguments;

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
        const result = fn(null, { ...args, family: 'Optima, serif' } as unknown as FontArguments);
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
        let result = fn(null, { ...args, weight: FontWeight.NORMAL });
        expect(result.spec.fontWeight).toBe('normal');
        expect(result.css).toContain('font-weight:normal');

        result = fn(null, { ...args, weight: FontWeight.BOLD });
        expect(result.spec.fontWeight).toBe('bold');
        expect(result.css).toContain('font-weight:bold');

        result = fn(null, { ...args, weight: FontWeight.BOLDER });
        expect(result.spec.fontWeight).toBe('bolder');
        expect(result.css).toContain('font-weight:bolder');

        result = fn(null, { ...args, weight: FontWeight.LIGHTER });
        expect(result.spec.fontWeight).toBe('lighter');
        expect(result.css).toContain('font-weight:lighter');

        result = fn(null, { ...args, weight: FontWeight.FOUR });
        expect(result.spec.fontWeight).toBe('400');
        expect(result.css).toContain('font-weight:400');
      });

      it('throws when provided an invalid weight', () => {
        expect(() => fn(null, { ...args, weight: 'foo' as FontWeight })).toThrow();
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
        let result = fn(null, { ...args, align: TextAlignment.LEFT });
        expect(result.spec.textAlign).toBe('left');
        expect(result.css).toContain('text-align:left');

        result = fn(null, { ...args, align: TextAlignment.CENTER });
        expect(result.spec.textAlign).toBe('center');
        expect(result.css).toContain('text-align:center');

        result = fn(null, { ...args, align: TextAlignment.RIGHT });
        expect(result.spec.textAlign).toBe('right');
        expect(result.css).toContain('text-align:right');

        result = fn(null, { ...args, align: TextAlignment.JUSTIFY });
        expect(result.spec.textAlign).toBe('justify');
        expect(result.css).toContain('text-align:justify');
      });

      it('throws when provided an invalid alignment', () => {
        expect(() => fn(null, { ...args, align: 'foo' as TextAlignment })).toThrow();
      });
    });
  });
});
