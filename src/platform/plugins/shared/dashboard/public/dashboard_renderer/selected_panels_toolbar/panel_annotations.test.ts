/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAnnotationsVisibility, setAnnotationsHidden } from './panel_annotations';

const createLensApi = (layers: Array<Record<string, unknown>>) => {
  let attributes = { state: { visualization: { layers } } };
  return {
    getFullAttributes: () => attributes,
    updateAttributes: jest.fn((next) => {
      attributes = next;
    }),
  };
};

const annotationLayer = (...hidden: boolean[]) => ({
  layerId: 'annotations',
  layerType: 'annotations',
  annotations: hidden.map((isHidden, i) => ({ id: `${i}`, isHidden })),
});

const dataLayer = { layerId: 'data', layerType: 'data' };

describe('panel annotations', () => {
  test('is "none" when no selected panel has annotations', () => {
    const children = { a: createLensApi([dataLayer]), b: { type: 'markdown' } };
    expect(getAnnotationsVisibility(children, new Set(['a', 'b']))).toBe('none');
  });

  test('ignores annotations in panels that are not selected', () => {
    const children = { a: createLensApi([dataLayer]), b: createLensApi([annotationLayer(false)]) };
    expect(getAnnotationsVisibility(children, new Set(['a']))).toBe('none');
  });

  test('is "visible" when any annotation is shown and "hidden" when all are hidden', () => {
    expect(
      getAnnotationsVisibility({ a: createLensApi([annotationLayer(true, false)]) }, new Set(['a']))
    ).toBe('visible');
    expect(
      getAnnotationsVisibility({ a: createLensApi([annotationLayer(true, true)]) }, new Set(['a']))
    ).toBe('hidden');
  });

  test('hides and shows every annotation in the selected panels', () => {
    const a = createLensApi([dataLayer, annotationLayer(false, true)]);
    const b = createLensApi([annotationLayer(false)]);
    const notSelected = createLensApi([annotationLayer(false)]);
    const children = { a, b, notSelected };
    const selected = new Set(['a', 'b']);

    setAnnotationsHidden(children, selected, true);
    expect(getAnnotationsVisibility(children, selected)).toBe('hidden');
    expect(notSelected.updateAttributes).not.toHaveBeenCalled();
    // data layers are left untouched
    expect(a.getFullAttributes().state.visualization.layers[0]).toBe(dataLayer);

    setAnnotationsHidden(children, selected, false);
    expect(getAnnotationsVisibility(children, selected)).toBe('visible');
    expect(getAnnotationsVisibility(children, new Set(['a']))).toBe('visible');
  });
});
