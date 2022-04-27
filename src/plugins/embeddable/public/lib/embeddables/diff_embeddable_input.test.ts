/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ViewMode } from '..';
import { KibanaExecutionContext } from '@kbn/core/types';
import { EmbeddableInput, omitGenericEmbeddableInput, genericEmbeddableInputIsEqual } from '.';

const getGenericEmbeddableState = (state?: Partial<EmbeddableInput>): EmbeddableInput => {
  const defaultState: EmbeddableInput = {
    lastReloadRequestTime: 1,
    executionContext: {} as KibanaExecutionContext,
    searchSessionId: 'what a session',
    hidePanelTitles: false,
    disabledActions: [],
    disableTriggers: false,
    enhancements: undefined,
    syncColors: false,
    viewMode: ViewMode.VIEW,
    title: 'So Very Generic',
    id: 'soVeryGeneric',
  };
  return { ...defaultState, ...state };
};

test('Omitting generic embeddable input omits all generic input keys', () => {
  const superEmbeddableSpecificInput = {
    SuperInputKeyA: 'I am so specific',
    SuperInputKeyB: 'I am extremely specific',
  };
  const fullInput = { ...getGenericEmbeddableState(), ...superEmbeddableSpecificInput };
  const omittedState = omitGenericEmbeddableInput(fullInput);

  const genericInputKeysToRemove: Array<keyof EmbeddableInput> = [
    'lastReloadRequestTime',
    'executionContext',
    'searchSessionId',
    'hidePanelTitles',
    'disabledActions',
    'disableTriggers',
    'enhancements',
    'syncColors',
    'viewMode',
    'title',
    'id',
  ];
  for (const key of genericInputKeysToRemove) {
    expect((omittedState as unknown as EmbeddableInput)[key]).toBeUndefined();
  }

  expect(omittedState.SuperInputKeyA).toBeDefined();
  expect(omittedState.SuperInputKeyB).toBeDefined();
});

describe('Generic embeddable input diff function', () => {
  it('considers blank string title to be distinct from undefined title', () => {
    const genericInputWithUndefinedTitle = getGenericEmbeddableState();
    genericInputWithUndefinedTitle.title = undefined;
    expect(
      genericEmbeddableInputIsEqual(
        getGenericEmbeddableState({ title: '' }),
        genericInputWithUndefinedTitle
      )
    ).toBe(false);
  });

  it('considers missing title key to be equal to input with undefined title', () => {
    const genericInputWithUndefinedTitle = getGenericEmbeddableState();
    genericInputWithUndefinedTitle.title = undefined;
    const genericInputWithDeletedTitle = getGenericEmbeddableState();
    delete genericInputWithDeletedTitle.title;
    expect(
      genericEmbeddableInputIsEqual(genericInputWithDeletedTitle, genericInputWithUndefinedTitle)
    ).toBe(true);
  });

  it('considers hide panel titles false to be equal to hide panel titles undefined', () => {
    const genericInputWithUndefinedShowPanelTitles = getGenericEmbeddableState();
    genericInputWithUndefinedShowPanelTitles.hidePanelTitles = undefined;
    expect(
      genericEmbeddableInputIsEqual(
        getGenericEmbeddableState(),
        genericInputWithUndefinedShowPanelTitles
      )
    ).toBe(true);
  });

  it('ignores differences in viewMode', () => {
    expect(
      genericEmbeddableInputIsEqual(
        getGenericEmbeddableState(),
        getGenericEmbeddableState({ viewMode: ViewMode.EDIT })
      )
    ).toBe(true);
  });

  it('ignores differences in searchSessionId', () => {
    expect(
      genericEmbeddableInputIsEqual(
        getGenericEmbeddableState(),
        getGenericEmbeddableState({ searchSessionId: 'What a lovely session!' })
      )
    ).toBe(true);
  });
});
