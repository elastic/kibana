/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { FilterableSource } from '@kbn/data-source';
import type { CreateControlTypeAction } from '../../../actions/control_panel_actions';
import { useControlType } from './use_control_type';

const buildSource = (name: string) => ({ id: name, title: name } as unknown as FilterableSource);

describe('useControlType', () => {
  const sourceOfNumbers = buildSource('numbers');
  const sourceOfKeywords = buildSource('keywords');

  let resolveKeywordsCompatibility: () => void;
  const keywordsCompatibility = new Promise<void>((resolve) => {
    resolveKeywordsCompatibility = resolve;
  });

  const controlActionRegistry = {
    rangeSlider: {
      type: 'rangeSlider',
      isCompatible: async ({ source }: { source?: FilterableSource }) => {
        if (source === sourceOfKeywords) await keywordsCompatibility;
        return source === sourceOfNumbers;
      },
    },
    optionsList: {
      type: 'optionsList',
      isCompatible: async () => true,
    },
  } as unknown as { [type: string]: CreateControlTypeAction };

  it('confirms the control type only once it is checked against the current source', async () => {
    const { result, rerender } = renderHook(
      ({ source }) =>
        useControlType({
          controlActionRegistry,
          fieldName: 'myField',
          source,
          selectedControlType: 'rangeSlider',
        }),
      { initialProps: { source: sourceOfNumbers } }
    );
    await waitFor(() => expect(result.current.isControlTypeConfirmed).toBe(true));

    rerender({ source: sourceOfKeywords });
    // the range slider fit the previous source, it is not known yet if it fits this one
    expect(result.current.isControlTypeConfirmed).toBe(false);

    resolveKeywordsCompatibility();
    await waitFor(() => expect(result.current.isControlTypeConfirmed).toBe(true));
    expect(result.current.controlType).toBe('optionsList');
  });

  it('does not confirm a control type without a source or a field', async () => {
    const { result } = renderHook(() =>
      useControlType({
        controlActionRegistry,
        fieldName: undefined,
        source: sourceOfNumbers,
        selectedControlType: 'optionsList',
      })
    );
    await waitFor(() => expect(result.current.isCompatible.optionsList).toBe(true));
    expect(result.current.isControlTypeConfirmed).toBe(false);
  });
});
