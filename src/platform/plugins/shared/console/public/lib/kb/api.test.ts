/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as bodyCompleter from '../autocomplete/body_completer';
import { Api } from './api';

describe('WHEN loading Console autocomplete definitions', () => {
  let compileBodyDescription: jest.SpyInstance;

  beforeEach(() => {
    compileBodyDescription = jest.spyOn(bodyCompleter, 'compileBodyDescription');
  });

  afterEach(() => {
    compileBodyDescription.mockRestore();
  });

  it('SHOULD compile endpoint body rules only when their components are first read', () => {
    const api = new Api();
    api.addEndpointDescription('endpoint', {
      patterns: ['_endpoint'],
      data_autocomplete_rules: { property: '' },
    });

    expect(compileBodyDescription).not.toHaveBeenCalled();

    const endpoint = api.getEndpointDescriptionByEndpoint('endpoint');
    const firstRead = endpoint?.bodyAutocompleteRootComponents;
    const secondRead = endpoint?.bodyAutocompleteRootComponents;

    expect(firstRead).toBe(secondRead);
    expect(compileBodyDescription).toHaveBeenCalledTimes(1);
    expect(compileBodyDescription).toHaveBeenCalledWith(
      'endpoint',
      { property: '' },
      expect.any(Object)
    );
  });

  it('SHOULD compile global rules only when first resolved and release their raw description', () => {
    const api = new Api();
    const apiInternals = api as unknown as {
      globalRules: Record<string, { description?: unknown } | undefined>;
    };
    api.addGlobalAutocompleteRules('__generated_rule', { property: '' });

    expect(compileBodyDescription).not.toHaveBeenCalled();
    expect(api.getGlobalAutocompleteComponents('__generated_rule', false)).toBeUndefined();
    expect(compileBodyDescription).not.toHaveBeenCalled();

    const firstRead = api.getGlobalAutocompleteComponents('__generated_rule');
    const secondRead = api.getGlobalAutocompleteComponents('__generated_rule');

    expect(firstRead).toBe(secondRead);
    expect(apiInternals.globalRules.__generated_rule?.description).toBeUndefined();
    expect(compileBodyDescription).toHaveBeenCalledTimes(1);
    expect(compileBodyDescription).toHaveBeenCalledWith(
      'GLOBAL.__generated_rule',
      { property: '' },
      expect.any(Object)
    );
  });
});
