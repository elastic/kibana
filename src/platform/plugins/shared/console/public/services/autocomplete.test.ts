/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AutoCompleteEntitiesApiResponse } from '../lib/autocomplete_entities/types';
import { AutocompleteInfo } from './autocomplete';
import type { Settings } from './settings';

const entitiesResponse = {
  mappings: {},
  aliases: {},
  dataStreams: { data_streams: [] },
  legacyTemplates: {},
  indexTemplates: { index_templates: [] },
  componentTemplates: { component_templates: [] },
} as AutoCompleteEntitiesApiResponse;

const createSettings = () =>
  ({
    getPolling: jest.fn().mockReturnValue(true),
    getPollInterval: jest.fn().mockReturnValue(60_000),
    getAutocomplete: jest.fn().mockReturnValue({
      fields: true,
      indices: true,
      templates: true,
      dataStreams: true,
    }),
  } as unknown as Settings);

const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A promise-like rejection whose derived promises are already handled.
 * `retrieve` is fire-and-forget and drops its internal chain, so a plain
 * rejected mock would surface as an unhandled rejection in the test runner;
 * this keeps the failure-path test focused on generation semantics.
 */
class HandledRejection {
  private readonly promise: Promise<unknown>;

  private constructor(promise: Promise<unknown>) {
    this.promise = promise;
    this.promise.catch(() => {});
  }

  static withError(error: Error) {
    return new HandledRejection(Promise.reject(error));
  }

  then(
    onfulfilled?: ((value: unknown) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null
  ) {
    return new HandledRejection(this.promise.then(onfulfilled, onrejected));
  }

  finally(onFinally?: (() => void) | null) {
    return new HandledRejection(this.promise.finally(onFinally));
  }
}

describe('AutocompleteInfo', () => {
  it('increments the entities refresh generation after a successful retrieve', async () => {
    const http = { get: jest.fn().mockResolvedValue(entitiesResponse) };
    const autocompleteInfo = new AutocompleteInfo();
    autocompleteInfo.setup(http as unknown as HttpSetup);
    const settings = createSettings();

    try {
      expect(autocompleteInfo.getEntitiesRefreshGeneration()).toBe(0);

      autocompleteInfo.retrieve(settings, settings.getAutocomplete());
      await flushAsync();

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(autocompleteInfo.getEntitiesRefreshGeneration()).toBe(1);
    } finally {
      autocompleteInfo.clearSubscriptions();
    }
  });

  it('does not increment the entities refresh generation when retrieve fails', async () => {
    const http = {
      get: jest
        .fn()
        .mockImplementation(() => HandledRejection.withError(new Error('entities request failed'))),
    };
    const autocompleteInfo = new AutocompleteInfo();
    autocompleteInfo.setup(http as unknown as HttpSetup);
    const settings = createSettings();

    try {
      autocompleteInfo.retrieve(settings, settings.getAutocomplete());
      await flushAsync();

      expect(autocompleteInfo.getEntitiesRefreshGeneration()).toBe(0);
    } finally {
      autocompleteInfo.clearSubscriptions();
    }
  });
});
