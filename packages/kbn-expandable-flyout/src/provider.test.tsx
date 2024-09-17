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
import { TestProvider } from './test/provider';
import { UrlSynchronizer } from './provider';
import * as actions from './store/actions';
import { State } from './store/state';
import { of } from 'rxjs';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockChange$ = jest.fn().mockReturnValue(of({}));
jest.mock('@kbn/kibana-utils-plugin/public');
const { createKbnUrlStateStorage } = jest.requireMock('@kbn/kibana-utils-plugin/public');

const urlKey = 'urlKey';

describe('UrlSynchronizer', () => {
  it(`should not dispatch any actions or update url if urlKey isn't passed`, () => {
    const urlChangedAction = jest.spyOn(actions, 'urlChangedAction');

    const initialState: State = {
      panels: {
        byId: {
          [urlKey]: {
            right: { id: 'key1' },
            left: { id: 'key11' },
            preview: undefined,
          },
        },
        needsSync: true,
      },
    };

    render(
      <TestProvider state={initialState}>
        <UrlSynchronizer />
      </TestProvider>
    );

    expect(urlChangedAction).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should update url if no panels exist', () => {
    (createKbnUrlStateStorage as jest.Mock).mockReturnValue({
      get: mockGet,
      set: mockSet,
      change$: mockChange$,
    });
    const initialState: State = {
      panels: {
        byId: {},
        needsSync: true,
      },
    };

    render(
      <TestProvider urlKey={urlKey} state={initialState}>
        <UrlSynchronizer />
      </TestProvider>
    );

    expect(mockSet).toHaveBeenCalledWith('urlKey', {
      left: undefined,
      right: undefined,
      preview: [undefined],
    });
  });

  it('should dispatch action and update url with the correct value', () => {
    const urlChangedAction = jest.spyOn(actions, 'urlChangedAction');

    (createKbnUrlStateStorage as jest.Mock).mockReturnValue({
      get: mockGet,
      set: mockSet,
      change$: mockChange$,
    });
    const initialState: State = {
      panels: {
        byId: {
          [urlKey]: {
            right: { id: 'key1' },
            left: { id: 'key2' },
            preview: undefined,
          },
        },
        needsSync: true,
      },
    };

    render(
      <TestProvider urlKey={urlKey} state={initialState}>
        <UrlSynchronizer />
      </TestProvider>
    );

    expect(urlChangedAction).toHaveBeenCalledWith({
      id: urlKey,
      preview: undefined,
    });
    expect(mockSet).toHaveBeenCalled();
  });
});
