/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPalette } from '.';

describe('getPalette', () => {
  const baseColor = '#fff';
  const invalidRules = [
    { id: 'some-id-0' },
    { id: 'some-id-1', value: 10 },
    { id: 'some-id-2', operator: 'gte' },
    { id: 'some-id-3', color: '#000' },
    { id: 'some-id-4', background_color: '#000' },
  ];

  describe('Metric', () => {
    test('should return undefined if no filled rules was provided', () => {
      expect(getPalette([])).toBeUndefined();
      expect(getPalette(invalidRules)).toBeUndefined();
    });

    test('should return undefined if only one valid rule is provided and it is not lte', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'gt', value: 100, background_color: '#000' },
        ])
      ).toBeUndefined();
    });

    test('should return custom palette if only one valid rule is provided and it is lte', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'lte', value: 100, background_color: '#000' },
        ])
      ).toEqual({
        name: 'custom',
        params: {
          colorStops: [{ color: '#000000', stop: 100 }],
          continuity: 'below',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 100,
          rangeMin: -Infinity,
          rangeType: 'number',
          reverse: false,
          steps: 1,
          stops: [{ color: '#000000', stop: 100 }],
        },
        type: 'palette',
      });
    });

    test('should return undefined if more than two types of rules', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'lte', value: 100, background_color: '#000' },
          { id: 'some-id-6', operator: 'gte', value: 150, background_color: '#000' },
          { id: 'some-id-7', operator: 'lt', value: 200, background_color: '#000' },
        ])
      ).toBeUndefined();
    });

    test('should return undefined if two types of rules and last rule is not lte', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'gte', value: 100, background_color: '#000' },
          { id: 'some-id-7', operator: 'lt', value: 200, background_color: '#000' },
          { id: 'some-id-6', operator: 'gte', value: 150, background_color: '#000' },
        ])
      ).toBeUndefined();
    });

    test('should return undefined if all rules are lte', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'lte', value: 100, background_color: '#000' },
          { id: 'some-id-7', operator: 'lte', value: 200, background_color: '#000' },
          { id: 'some-id-6', operator: 'lte', value: 150, background_color: '#000' },
        ])
      ).toBeUndefined();
    });

    test('should return undefined if two types of rules and all except last one are lt and last one is not lte', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'lt', value: 100, background_color: '#000' },
          { id: 'some-id-7', operator: 'gte', value: 200, background_color: '#000' },
          { id: 'some-id-6', operator: 'lt', value: 150, background_color: '#000' },
        ])
      ).toBeUndefined();
    });

    test('should return custom palette if two types of rules and all except last one is lt and last one is lte', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'lt', value: 100, background_color: '#000' },
          { id: 'some-id-7', operator: 'lte', value: 200, background_color: '#000' },
          { id: 'some-id-6', operator: 'lt', value: 150, background_color: '#000' },
        ])
      ).toEqual({
        name: 'custom',
        params: {
          colorStops: [
            { color: '#000000', stop: -Infinity },
            { color: '#000000', stop: 100 },
            { color: '#000000', stop: 150 },
          ],
          continuity: 'below',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 200,
          rangeMin: -Infinity,
          rangeType: 'number',
          reverse: false,
          steps: 4,
          stops: [
            { color: '#000000', stop: 100 },
            { color: '#000000', stop: 150 },
            { color: '#000000', stop: 200 },
          ],
        },
        type: 'palette',
      });
    });

    test('should return custom palette if last one is lte and all previous are gte', () => {
      expect(getPalette([])).toBeUndefined();
      expect(
        getPalette([
          ...invalidRules,
          { id: 'some-id-5', operator: 'gte', value: 100, background_color: '#000' },
          { id: 'some-id-7', operator: 'lte', value: 200, background_color: '#000' },
          { id: 'some-id-6', operator: 'gte', value: 150, background_color: '#000' },
        ])
      ).toEqual({
        name: 'custom',
        params: {
          colorStops: [
            { color: '#000000', stop: 100 },
            { color: '#000000', stop: 150 },
          ],
          continuity: 'none',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 200,
          rangeMin: 100,
          rangeType: 'number',
          reverse: false,
          steps: 2,
          stops: [
            { color: '#000000', stop: 150 },
            { color: '#000000', stop: 200 },
          ],
        },
        type: 'palette',
      });
    });
  });

  describe('Gauge', () => {
    test('should return undefined if no filled rules was provided', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(getPalette(invalidRules, baseColor)).toBeUndefined();
    });

    test('should return undefined if only one valid rule is provided and it is not lte', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [...invalidRules, { id: 'some-id-5', operator: 'gt', value: 100, gauge: '#000' }],
          baseColor
        )
      ).toBeUndefined();
    });

    test('should return custom palette if only one valid rule is provided and it is lte', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [...invalidRules, { id: 'some-id-5', operator: 'lte', value: 100, gauge: '#000' }],
          baseColor
        )
      ).toEqual({
        name: 'custom',
        params: {
          colorStops: [{ color: '#000000', stop: 100 }],
          continuity: 'below',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 100,
          rangeMin: -Infinity,
          rangeType: 'number',
          reverse: false,
          steps: 1,
          stops: [{ color: '#000000', stop: 100 }],
        },
        type: 'palette',
      });
    });

    test('should return undefined if more than two types of rules', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [
            ...invalidRules,
            { id: 'some-id-5', operator: 'lte', value: 100, gauge: '#000' },
            { id: 'some-id-6', operator: 'gte', value: 150, gauge: '#000' },
            { id: 'some-id-7', operator: 'lt', value: 200, gauge: '#000' },
          ],
          baseColor
        )
      ).toBeUndefined();
    });

    test('should return undefined if two types of rules and last rule is not lte', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [
            ...invalidRules,
            { id: 'some-id-5', operator: 'gte', value: 100, gauge: '#000' },
            { id: 'some-id-7', operator: 'lt', value: 200, gauge: '#000' },
            { id: 'some-id-6', operator: 'gte', value: 150, gauge: '#000' },
          ],
          baseColor
        )
      ).toBeUndefined();
    });

    test('should return undefined if all rules are lte', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [
            ...invalidRules,
            { id: 'some-id-5', operator: 'lte', value: 100, gauge: '#000' },
            { id: 'some-id-7', operator: 'lte', value: 200, gauge: '#000' },
            { id: 'some-id-6', operator: 'lte', value: 150, gauge: '#000' },
          ],
          baseColor
        )
      ).toBeUndefined();
    });

    test('should return undefined if two types of rules and all except last one are lt and last one is not lte', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [
            ...invalidRules,
            { id: 'some-id-5', operator: 'lt', value: 100, gauge: '#000' },
            { id: 'some-id-7', operator: 'gte', value: 200, gauge: '#000' },
            { id: 'some-id-6', operator: 'lt', value: 150, gauge: '#000' },
          ],
          baseColor
        )
      ).toBeUndefined();
    });

    test('should return custom palette if two types of rules and all except last one is lt and last one is lte', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [
            ...invalidRules,
            { id: 'some-id-5', operator: 'lt', value: 100, gauge: '#000' },
            { id: 'some-id-7', operator: 'lte', value: 200, gauge: '#000' },
            { id: 'some-id-6', operator: 'lt', value: 150, gauge: '#000' },
          ],
          baseColor
        )
      ).toEqual({
        name: 'custom',
        params: {
          colorStops: [
            { color: '#000000', stop: -Infinity },
            { color: '#000000', stop: 100 },
            { color: '#000000', stop: 150 },
          ],
          continuity: 'below',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 200,
          rangeMin: -Infinity,
          rangeType: 'number',
          reverse: false,
          steps: 4,
          stops: [
            { color: '#000000', stop: 100 },
            { color: '#000000', stop: 150 },
            { color: '#000000', stop: 200 },
          ],
        },
        type: 'palette',
      });
    });

    test('should return custom palette if last one is lte and all previous are gte', () => {
      expect(getPalette([], baseColor)).toBeUndefined();
      expect(
        getPalette(
          [
            ...invalidRules,
            { id: 'some-id-5', operator: 'gte', value: 100, gauge: '#000' },
            { id: 'some-id-7', operator: 'lte', value: 200, gauge: '#000' },
            { id: 'some-id-6', operator: 'gte', value: 150, gauge: '#000' },
          ],
          baseColor
        )
      ).toEqual({
        name: 'custom',
        params: {
          colorStops: [
            { color: baseColor, stop: -Infinity },
            { color: '#000000', stop: 100 },
            { color: '#000000', stop: 150 },
          ],
          continuity: 'below',
          maxSteps: 5,
          name: 'custom',
          progression: 'fixed',
          rangeMax: 200,
          rangeMin: -Infinity,
          rangeType: 'number',
          reverse: false,
          steps: 3,
          stops: [
            { color: baseColor, stop: 100 },
            { color: '#000000', stop: 150 },
            { color: '#000000', stop: 200 },
          ],
        },
        type: 'palette',
      });
    });
  });
});
