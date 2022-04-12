/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setupGetValueSuggestions } from './value';
import dataViewResponse from './__fixtures__/data_view_response.json';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { KueryNode } from '../../../../../data/public';
import { QuerySuggestionGetFnArgs } from '../../index';

const mockKueryNode = (kueryNode: Partial<KueryNode>) => kueryNode as unknown as KueryNode;

describe('Kuery value suggestions', () => {
  let getSuggestions: ReturnType<typeof setupGetValueSuggestions>;
  let querySuggestionsArgs: QuerySuggestionGetFnArgs;
  let autocompleteServiceMock: any;

  beforeEach(() => {
    autocompleteServiceMock = {
      getValueSuggestions: jest.fn(({ field }) => {
        let res: any[];

        if (field.type === 'boolean') {
          res = [true, false];
        } else if (field.name === 'machine.os') {
          res = ['Windo"ws', "Mac'", 'Linux'];
        } else if (field.name === 'nestedField.child') {
          res = ['foo'];
        } else {
          res = [];
        }
        return Promise.resolve(res);
      }),
    };

    const coreSetup = coreMock.createSetup({
      pluginStartContract: {
        autocomplete: autocompleteServiceMock,
      },
    });
    getSuggestions = setupGetValueSuggestions(coreSetup);
    querySuggestionsArgs = {
      dataViews: [dataViewResponse],
    } as unknown as QuerySuggestionGetFnArgs;

    jest.clearAllMocks();
  });

  test('should return a function', () => {
    expect(typeof getSuggestions).toBe('function');
  });

  test('should not search for non existing field', async () => {
    const fieldName = 'i_dont_exist';
    const prefix = '';
    const suffix = '';

    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({ fieldName, prefix, suffix })
    );

    expect(suggestions.map(({ text }) => text)).toEqual([]);
    expect(autocompleteServiceMock.getValueSuggestions).toHaveBeenCalledTimes(0);
  });

  test('should format suggestions', async () => {
    const start = 1;
    const end = 5;
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({
        fieldName: 'ssl',
        prefix: '',
        suffix: '',
        start,
        end,
      })
    );

    expect(suggestions[0].type).toEqual('value');
    expect(suggestions[0].start).toEqual(start);
    expect(suggestions[0].end).toEqual(end);
  });

  test('should handle nested paths', async () => {
    const suggestions = await getSuggestions(
      querySuggestionsArgs,
      mockKueryNode({
        fieldName: 'child',
        nestedPath: 'nestedField',
        prefix: '',
        suffix: '',
      })
    );

    expect(suggestions.length).toEqual(1);
    expect(suggestions[0].text).toEqual('"foo" ');
  });

  describe('Boolean suggestions', () => {
    test('should stringify boolean fields', async () => {
      const suggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          fieldName: 'ssl',
          prefix: '',
          suffix: '',
        })
      );

      expect(suggestions.map(({ text }) => text)).toEqual(['true ', 'false ']);
      expect(autocompleteServiceMock.getValueSuggestions).toHaveBeenCalledTimes(1);
    });

    test('should filter out boolean suggestions', async () => {
      const suggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          fieldName: 'ssl',
          prefix: 'fa',
          suffix: '',
        })
      );

      expect(suggestions.length).toEqual(1);
    });
  });

  describe('String suggestions', () => {
    test('should merge prefix and suffix', async () => {
      const prefix = 'he';
      const suffix = 'llo';

      await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          fieldName: 'machine.os.raw',
          prefix,
          suffix,
        })
      );

      expect(autocompleteServiceMock.getValueSuggestions).toHaveBeenCalledTimes(1);
      expect(autocompleteServiceMock.getValueSuggestions).toBeCalledWith(
        expect.objectContaining({
          field: expect.any(Object),
          query: prefix + suffix,
        })
      );
    });

    test('should escape quotes in suggestions', async () => {
      const suggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          fieldName: 'machine.os',
          prefix: '',
          suffix: '',
        })
      );

      expect(suggestions[0].text).toEqual('"Windo\\"ws" ');
      expect(suggestions[1].text).toEqual('"Mac\'" ');
      expect(suggestions[2].text).toEqual('"Linux" ');
    });

    test('should filter out string suggestions', async () => {
      const suggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          fieldName: 'machine.os',
          prefix: 'banana',
          suffix: '',
        })
      );

      expect(suggestions.length).toEqual(0);
    });

    test('should partially filter out string suggestions - case insensitive', async () => {
      const suggestions = await getSuggestions(
        querySuggestionsArgs,
        mockKueryNode({
          fieldName: 'machine.os',
          prefix: 'ma',
          suffix: '',
        })
      );

      expect(suggestions.length).toEqual(1);
    });
  });
});
