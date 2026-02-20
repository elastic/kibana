/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { act, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import { getESQLSources } from '@kbn/esql-utils';
import { SourcesDropdown } from './sources_dropdown';

jest.mock('@kbn/esql-utils', () => ({
  getESQLSources: jest.fn(),
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('SourcesDropdown', () => {
  it('does not repeatedly fetch sources on rerenders while options are empty', async () => {
    const coreStart = coreMock.createStart();
    const deferred = createDeferred<ESQLSourceResult[]>();
    const getESQLSourcesMock = getESQLSources as jest.MockedFunction<typeof getESQLSources>;
    getESQLSourcesMock.mockReturnValue(deferred.promise);

    const services = {
      core: coreStart,
      esql: { getLicense: jest.fn() },
    };

    const onChangeSpy = jest.fn();
    const makeOnChange = () => (newSources: string[]) => onChangeSpy(newSources);

    const { rerender } = renderWithI18n(
      <KibanaContextProvider services={services}>
        <SourcesDropdown currentSources={[]} onChangeSources={makeOnChange()} />
      </KibanaContextProvider>
    );

    await waitFor(() => {
      expect(getESQLSourcesMock).toHaveBeenCalled();
    });

    // Trigger re-renders that change `onChangeSources` identity while the request is still pending.
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        rerender(
          <KibanaContextProvider services={services}>
            <SourcesDropdown currentSources={[]} onChangeSources={makeOnChange()} />
          </KibanaContextProvider>
        );
      }
    });
    const callCountAfterFirstRerenderBurst = getESQLSourcesMock.mock.calls.length;

    await act(async () => {
      deferred.resolve([
        { name: 'test_index', hidden: false, type: 'index' } as ESQLSourceResult,
        { name: 'logs', hidden: false, type: 'index' } as ESQLSourceResult,
      ]);
    });

    await waitFor(() => {
      expect(onChangeSpy).toHaveBeenCalledTimes(1);
      expect(onChangeSpy).toHaveBeenCalledWith(['test_index']);
    });

    // After sources are fetched, we should not issue additional fetches.
    expect(getESQLSourcesMock.mock.calls.length).toBe(callCountAfterFirstRerenderBurst);
  });
});
