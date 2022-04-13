/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '../../../core/server/mocks';

import { autocompleteConfigDeprecationProvider } from './config_deprecations';

const deprecationContext = configDeprecationsMock.createContext();

const applyConfigDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = autocompleteConfigDeprecationProvider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const migrated = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: '',
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated: migrated.config,
  };
};

describe('Config Deprecations', () => {
  it('does not report deprecations for default configurationc', () => {
    const configFirstStep = { data: { autocomplete: { valueSuggestions: {} } } };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(configFirstStep));
    expect(migrated).toEqual(configFirstStep);
    expect(messages).toHaveLength(0);
  });

  it('renames kibana.autocompleteTerminateAfter to unifiedSearch.autocomplete.valueSuggestions.terminateAfter', () => {
    const config = {
      kibana: {
        autocompleteTerminateAfter: 123,
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.kibana?.autocompleteTerminateAfter).not.toBeDefined();
    expect(migrated.unifiedSearch.autocomplete.valueSuggestions.terminateAfter).toEqual(123);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Setting \\"kibana.autocompleteTerminateAfter\\" has been replaced by \\"unifiedSearch.autocomplete.valueSuggestions.terminateAfter\\"",
      ]
    `);
  });

  it('renames kibana.autocompleteTimeout to unifiedSearch.autocomplete.valueSuggestions.timeout', () => {
    const config = {
      kibana: {
        autocompleteTimeout: 123,
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.kibana?.autocompleteTimeout).not.toBeDefined();
    expect(migrated.unifiedSearch.autocomplete.valueSuggestions.timeout).toEqual(123);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Setting \\"kibana.autocompleteTimeout\\" has been replaced by \\"unifiedSearch.autocomplete.valueSuggestions.timeout\\"",
      ]
    `);
  });

  it('renames data.autocomplete.querySuggestions.enabled to unifiedSearch.autocomplete.querySuggestions.enabled', () => {
    const config = {
      data: {
        autocomplete: {
          querySuggestions: {
            enabled: false,
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.data?.autocomplete.querySuggestions.enabled).not.toBeDefined();
    expect(migrated.unifiedSearch.autocomplete.querySuggestions.enabled).toEqual(false);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Setting \\"data.autocomplete.querySuggestions.enabled\\" has been replaced by \\"unifiedSearch.autocomplete.querySuggestions.enabled\\"",
      ]
    `);
  });

  it('renames data.autocomplete.valueSuggestions.enabled to unifiedSearch.autocomplete.valueSuggestions.enabled', () => {
    const config = {
      data: {
        autocomplete: {
          valueSuggestions: {
            enabled: false,
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.data?.autocomplete.valueSuggestions.enabled).not.toBeDefined();
    expect(migrated.unifiedSearch.autocomplete.valueSuggestions.enabled).toEqual(false);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Setting \\"data.autocomplete.valueSuggestions.enabled\\" has been replaced by \\"unifiedSearch.autocomplete.valueSuggestions.enabled\\"",
      ]
    `);
  });

  it('renames data.autocomplete.valueSuggestions.tiers to unifiedSearch.autocomplete.valueSuggestions.tiers', () => {
    const config = {
      data: {
        autocomplete: {
          valueSuggestions: {
            tiers: [],
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.data?.autocomplete.valueSuggestions.tiers).not.toBeDefined();
    expect(migrated.unifiedSearch.autocomplete.valueSuggestions.tiers).toEqual([]);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Setting \\"data.autocomplete.valueSuggestions.tiers\\" has been replaced by \\"unifiedSearch.autocomplete.valueSuggestions.tiers\\"",
      ]
    `);
  });
});
