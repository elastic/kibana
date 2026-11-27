/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import type { HttpSetup } from '@kbn/core/public';
import { populateContext } from '../autocomplete/engine';

import * as kb from '.';
import { AutocompleteInfo, setAutocompleteInfo } from '../../services';
import type { AutoCompleteContext, ResultTerm } from '../autocomplete/types';
import { isRecord } from '../../../common/utils/record_utils';

describe('Knowledge base', () => {
  let autocompleteInfo: AutocompleteInfo;
  beforeEach(() => {
    kb._test.setActiveApi(kb._test.loadApisFromJson({}));
    autocompleteInfo = new AutocompleteInfo();
    setAutocompleteInfo(autocompleteInfo);
    autocompleteInfo.mapping.clearMappings();
  });
  afterEach(() => {
    kb._test.setActiveApi(kb._test.loadApisFromJson({}));
    setAutocompleteInfo(autocompleteInfo);
  });

  const MAPPING = {
    index1: {
      properties: {
        'field1.1.1': { type: 'string' },
        'field1.1.2': { type: 'long' },
      },
    },
    index2: {
      properties: {
        'field2.1.1': { type: 'string' },
        'field2.1.2': { type: 'string' },
      },
    },
  };

  type TokenPath = Array<string | string[]>;
  type ExpectedContext = Partial<AutoCompleteContext> & {
    autoCompleteSet?: Array<string | ResultTerm>;
  };

  const normalizeTerm = (term: string | ResultTerm): ResultTerm =>
    _.isString(term) ? { name: term } : term;

  function testUrlContext(
    tokenPath: TokenPath,
    otherTokenValues: AutoCompleteContext['otherTokenValues'],
    expectedContext: ExpectedContext
  ) {
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, normalizeTerm);
    }

    const context: AutoCompleteContext = { otherTokenValues };
    populateContext(tokenPath, context, null, true, kb.getTopLevelUrlCompleteComponents('GET'));

    const actualContext: Record<string, unknown> = { ...context };

    // override endpoint to just check on id
    if (isRecord(actualContext.endpoint) && typeof actualContext.endpoint.id === 'string') {
      actualContext.endpoint = actualContext.endpoint.id;
    }

    delete actualContext.otherTokenValues;

    const norm = (t: string | ResultTerm) => normalizeTerm(t);

    if (Array.isArray(actualContext.autoCompleteSet)) {
      actualContext.autoCompleteSet = _.sortBy(_.map(actualContext.autoCompleteSet, norm), 'name');
    }
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.sortBy(
        _.map(expectedContext.autoCompleteSet, norm),
        'name'
      );
    }

    expect(actualContext).toEqual(expectedContext);
  }

  function i(term: string): ResultTerm {
    return { name: term, meta: 'index' };
  }

  function indexTest(
    name: string,
    tokenPath: TokenPath,
    otherTokenValues: AutoCompleteContext['otherTokenValues'],
    expectedContext: ExpectedContext
  ) {
    test(name, function () {
      const testApi = kb._test.loadApisFromJson(
        {
          indexTest: {
            endpoints: {
              _multi_indices: {
                patterns: ['{index}/_multi_indices'],
              },
              _single_index: { patterns: ['{index}/_single_index'] },
              _no_index: {
                // testing default patters
                //  patterns: ["_no_index"]
              },
            },
          },
        },
        undefined
      );

      kb._test.setActiveApi(testApi);

      autocompleteInfo.mapping.loadMappings(MAPPING);
      testUrlContext(tokenPath, otherTokenValues, expectedContext);
    });
  }

  indexTest('Index integration 1', [], [], {
    autoCompleteSet: ['_no_index', i('index1'), i('index2')],
  });

  indexTest(
    'Index integration 2',
    [],
    ['index1'],
    // still return _no_index as index1 is not committed to yet.
    { autoCompleteSet: ['_no_index', i('index2')] }
  );

  indexTest('Index integration 2', ['index1'], [], {
    indices: ['index1'],
    autoCompleteSet: ['_multi_indices', '_single_index'],
  });

  indexTest('Index integration 2', [['index1', 'index2']], [], {
    indices: ['index1', 'index2'],
    autoCompleteSet: ['_multi_indices', '_single_index'],
  });

  describe('loadActiveApi', () => {
    const SPEC_RESPONSE = {
      es: {
        endpoints: {
          search: {
            methods: ['GET'],
            patterns: ['_search'],
            documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/search',
          },
        },
      },
      kibana: { docLinks: { '/api/spaces/space/{id}': { get: 'get-spaces-space-id' } } },
    };

    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      kb._test.resetApiLoaded();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      kb._test.resetApiLoaded();
      kb._test.setKibanaApiDocLinks({});
    });

    const loadWithTimers = async (http: { get: jest.Mock }) => {
      jest.useFakeTimers();
      try {
        const loaded = kb.loadActiveApi(http as unknown as HttpSetup);
        // Let every backoff between the attempts elapse.
        await jest.advanceTimersByTimeAsync(10_000);
        return await loaded;
      } finally {
        jest.useRealTimers();
      }
    };

    it('loads the definitions and resolves to true', async () => {
      const http = { get: jest.fn().mockResolvedValue(SPEC_RESPONSE) };

      await expect(kb.loadActiveApi(http as unknown as HttpSetup)).resolves.toBe(true);
      expect(http.get).toHaveBeenCalledTimes(1);
      expect(kb.getKibanaApiDocLinks()).toEqual(SPEC_RESPONSE.kibana.docLinks);
      expect(kb.getEndpointDescriptionByEndpoint('search')).toMatchObject({
        documentation: SPEC_RESPONSE.es.endpoints.search.documentation,
      });
    });

    it('does not fetch again once the definitions are loaded', async () => {
      const http = { get: jest.fn().mockResolvedValue(SPEC_RESPONSE) };

      await kb.loadActiveApi(http as unknown as HttpSetup);
      await expect(kb.loadActiveApi(http as unknown as HttpSetup)).resolves.toBe(true);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('retries a transient failure instead of leaving Console without definitions', async () => {
      const http = {
        get: jest
          .fn()
          .mockRejectedValueOnce({ responseText: 'Not Found' })
          .mockResolvedValue(SPEC_RESPONSE),
      };

      await expect(loadWithTimers(http)).resolves.toBe(true);
      expect(http.get).toHaveBeenCalledTimes(2);
      expect(kb.getKibanaApiDocLinks()).toEqual(SPEC_RESPONSE.kibana.docLinks);
    });

    it('resolves to false and allows a later retry once the attempts are exhausted', async () => {
      const http = { get: jest.fn().mockRejectedValue({ responseText: 'Not Found' }) };

      await expect(loadWithTimers(http)).resolves.toBe(false);
      expect(http.get).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);

      // The failure must not be remembered as a successful load.
      http.get.mockResolvedValue(SPEC_RESPONSE);
      await expect(kb.loadActiveApi(http as unknown as HttpSetup)).resolves.toBe(true);
    });

    it('shares the in-flight load with an overlapping call', async () => {
      const http = { get: jest.fn().mockResolvedValue(SPEC_RESPONSE) };

      await expect(
        Promise.all([
          kb.loadActiveApi(http as unknown as HttpSetup),
          kb.loadActiveApi(http as unknown as HttpSetup),
        ])
      ).resolves.toEqual([true, true]);
      expect(http.get).toHaveBeenCalledTimes(1);
    });

    it('does not report an overlapping call as loaded while the in-flight load fails', async () => {
      const http = { get: jest.fn().mockRejectedValue({ responseText: 'Not Found' }) };

      jest.useFakeTimers();
      try {
        const first = kb.loadActiveApi(http as unknown as HttpSetup);
        const overlapping = kb.loadActiveApi(http as unknown as HttpSetup);
        await jest.advanceTimersByTimeAsync(10_000);
        await expect(Promise.all([first, overlapping])).resolves.toEqual([false, false]);
      } finally {
        jest.useRealTimers();
      }
      expect(http.get).toHaveBeenCalledTimes(3);
    });

    it('treats a response without Elasticsearch definitions as a failure', async () => {
      const http = { get: jest.fn().mockResolvedValue({ kibana: { docLinks: {} } }) };

      await expect(loadWithTimers(http)).resolves.toBe(false);
      expect(http.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('Kibana API doc links', () => {
    afterEach(() => {
      kb._test.setKibanaApiDocLinks({});
    });

    it('returns an empty map by default', () => {
      expect(kb.getKibanaApiDocLinks()).toEqual({});
    });

    it('stores and returns the provided doc links map', () => {
      const docLinks = { '/api/spaces/space/{id}': { get: 'get-spaces-space-id' } };
      kb._test.setKibanaApiDocLinks(docLinks);
      expect(kb.getKibanaApiDocLinks()).toEqual(docLinks);
    });

    it('ignores non-record values', () => {
      kb._test.setKibanaApiDocLinks({ foo: 'bar' });
      kb._test.setKibanaApiDocLinks('not a record');
      expect(kb.getKibanaApiDocLinks()).toEqual({ foo: 'bar' });
    });
  });

  describe('WHEN body rules use a generated shared global', () => {
    it('SHOULD resolve the shared rules through the existing scope-link consumer', () => {
      const api = kb._test.loadApisFromJson({
        es: {
          globals: {
            __generated_rule: {
              first_property: '',
              second_property: '',
            },
          },
          endpoints: {
            endpoint: {
              data_autocomplete_rules: {
                __scope_link: 'GLOBAL.__generated_rule',
              },
            },
          },
        },
      });
      kb._test.setActiveApi(api);
      const context = {
        otherTokenValues: [],
        endpointComponentResolver: kb.getEndpointBodyCompleteComponents,
        globalComponentResolver: kb.getGlobalAutocompleteComponents,
      } as AutoCompleteContext & {
        endpointComponentResolver: typeof kb.getEndpointBodyCompleteComponents;
        globalComponentResolver: typeof kb.getGlobalAutocompleteComponents;
      };

      populateContext(['{'], context, null, true, kb.getEndpointBodyCompleteComponents('endpoint'));

      expect(context.autoCompleteSet).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'first_property' }),
          expect.objectContaining({ name: 'second_property' }),
        ])
      );
    });
  });

  describe('WHEN a mapping field name collides with a global rule', () => {
    it('SHOULD prefer mapping wildcard suggestions through endpoint scope links', () => {
      const api = kb._test.loadApisFromJson({
        es: {
          globals: {
            query: {
              bool: {},
              match: {},
            },
          },
          endpoints: {
            put_mapping: {
              data_autocomplete_rules: {
                properties: {
                  '*': {
                    analyzer: 'standard',
                    type: {
                      __one_of: ['keyword', 'text'],
                    },
                  },
                },
              },
            },
            'indices.put_mapping': {
              data_autocomplete_rules: {
                __scope_link: 'put_mapping',
              },
            },
          },
        },
      });
      kb._test.setActiveApi(api);
      const context = {
        otherTokenValues: [],
        endpointComponentResolver: kb.getEndpointBodyCompleteComponents,
        globalComponentResolver: kb.getGlobalAutocompleteComponents,
      } as AutoCompleteContext & {
        endpointComponentResolver: typeof kb.getEndpointBodyCompleteComponents;
        globalComponentResolver: typeof kb.getGlobalAutocompleteComponents;
      };

      populateContext(
        ['{', 'properties', '{', 'query', '{'],
        context,
        null,
        true,
        kb.getEndpointBodyCompleteComponents('indices.put_mapping')
      );

      const suggestionNames = context.autoCompleteSet?.map(({ name }) => name);
      expect(suggestionNames).toEqual(expect.arrayContaining(['analyzer', 'type']));
      expect(suggestionNames).not.toContain('bool');
      expect(suggestionNames).not.toContain('match');
    });
  });

  describe('WHEN body rules contain primitive suggestions', () => {
    it('SHOULD preserve boolean, number, and string term types', () => {
      const api = kb._test.loadApisFromJson({
        es: {
          endpoints: {
            endpoint: {
              data_autocomplete_rules: {
                value: {
                  __one_of: [true, false, 0, 42, 'false', '42'],
                },
              },
            },
          },
        },
      });
      kb._test.setActiveApi(api);
      const context = {
        otherTokenValues: [],
        endpointComponentResolver: kb.getEndpointBodyCompleteComponents,
        globalComponentResolver: kb.getGlobalAutocompleteComponents,
      } as AutoCompleteContext & {
        endpointComponentResolver: typeof kb.getEndpointBodyCompleteComponents;
        globalComponentResolver: typeof kb.getGlobalAutocompleteComponents;
      };

      populateContext(
        ['{', 'value'],
        context,
        null,
        true,
        kb.getEndpointBodyCompleteComponents('endpoint')
      );

      expect(
        context.autoCompleteSet
          ?.map(({ name }) => `${typeof name}:${String(name)}`)
          .sort((left, right) => left.localeCompare(right))
      ).toEqual([
        'boolean:false',
        'boolean:true',
        'number:0',
        'number:42',
        'string:42',
        'string:false',
      ]);
    });
  });
});
