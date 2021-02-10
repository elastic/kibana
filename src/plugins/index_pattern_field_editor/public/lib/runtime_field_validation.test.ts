/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataPluginMock } from '../../../data/public/mocks';
import { getRuntimeFieldValidator } from './runtime_field_validation';

const dataStart = dataPluginMock.createStartContract();
const { search } = dataStart;

const runtimeField = {
  type: 'keyword',
  script: {
    source: 'emit("hello")',
  },
};

const spy = jest.fn();

search.search = () =>
  ({
    toPromise: spy,
  } as any);

const validator = getRuntimeFieldValidator('myIndex', search);

describe('Runtime field validation', () => {
  const expectedError = {
    message: 'Error compiling the painless script',
    position: { offset: 4, start: 0, end: 18 },
    reason: 'cannot resolve symbol [emit]',
    scriptStack: ["emit.some('value')", '    ^---- HERE'],
  };

  [
    {
      title: 'should return null when there are no errors',
      response: {},
      status: 200,
      expected: null,
    },
    {
      title: 'should return the error in the first failed shard',
      response: {
        attributes: {
          type: 'status_exception',
          reason: 'error while executing search',
          caused_by: {
            failed_shards: [
              {
                shard: 0,
                index: 'kibana_sample_data_logs',
                node: 'gVwk20UWSdO6VyuNOc_6UA',
                reason: {
                  type: 'script_exception',
                  script_stack: ["emit.some('value')", '    ^---- HERE'],
                  position: { offset: 4, start: 0, end: 18 },
                  caused_by: {
                    type: 'illegal_argument_exception',
                    reason: 'cannot resolve symbol [emit]',
                  },
                },
              },
            ],
          },
        },
      },
      status: 400,
      expected: expectedError,
    },
    {
      title: 'should return the error in the third failed shard',
      response: {
        attributes: {
          type: 'status_exception',
          reason: 'error while executing search',
          caused_by: {
            failed_shards: [
              {
                shard: 0,
                index: 'kibana_sample_data_logs',
                node: 'gVwk20UWSdO6VyuNOc_6UA',
                reason: {
                  type: 'foo',
                },
              },
              {
                shard: 1,
                index: 'kibana_sample_data_logs',
                node: 'gVwk20UWSdO6VyuNOc_6UA',
                reason: {
                  type: 'bar',
                },
              },
              {
                shard: 2,
                index: 'kibana_sample_data_logs',
                node: 'gVwk20UWSdO6VyuNOc_6UA',
                reason: {
                  type: 'script_exception',
                  script_stack: ["emit.some('value')", '    ^---- HERE'],
                  position: { offset: 4, start: 0, end: 18 },
                  caused_by: {
                    type: 'illegal_argument_exception',
                    reason: 'cannot resolve symbol [emit]',
                  },
                },
              },
            ],
          },
        },
      },
      status: 400,
      expected: expectedError,
    },
    {
      title: 'should have default values if an error prop is not found',
      response: {
        attributes: {
          type: 'status_exception',
          reason: 'error while executing search',
          caused_by: {
            failed_shards: [
              {
                shard: 0,
                index: 'kibana_sample_data_logs',
                node: 'gVwk20UWSdO6VyuNOc_6UA',
                reason: {
                  // script_stack, position and caused_by are missing
                  type: 'script_exception',
                  caused_by: {
                    type: 'illegal_argument_exception',
                  },
                },
              },
            ],
          },
        },
      },
      status: 400,
      expected: {
        message: 'Error compiling the painless script',
        position: null,
        reason: null,
        scriptStack: [],
      },
    },
  ].map(({ title, response, status, expected }) => {
    test(title, async () => {
      if (status !== 200) {
        spy.mockRejectedValueOnce(response);
      } else {
        spy.mockResolvedValueOnce(response);
      }

      const result = await validator(runtimeField);

      expect(result).toEqual(expected);
    });
  });
});
