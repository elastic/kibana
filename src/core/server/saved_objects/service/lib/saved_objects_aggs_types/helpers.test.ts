/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as rt from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { excess } from './helpers';

const runDecode = (codec: rt.Type<any>, data: any) => {
  const result = codec.decode(data);
  return PathReporter.report(result);
};

describe('Saved object aggs helpers', () => {
  describe('happy path', () => {
    test('excess Record<String, Partial>', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.partial({
            max: rt.type({ field: rt.string }),
          })
        )
      );

      expect(runDecode(codec, { aggName: { max: { field: 'hi' } } })).toEqual(['No errors!']);
    });

    test('excess Record<String, Intersection>', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.intersection([
            rt.partial({
              max: rt.type({ field: rt.string }),
            }),
            rt.partial({
              min: rt.type({ field: rt.string }),
            }),
          ])
        )
      );

      expect(runDecode(codec, { aggName: { min: { field: 'hi' } } })).toEqual(['No errors!']);
    });

    test('When you intersection as a DictionnaryType', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.intersection([
            rt.partial({
              max: rt.type({ field: rt.string }),
            }),
            rt.partial({
              filter: rt.type({ field: rt.string }),
              aggs: rt.record(
                rt.string,
                rt.partial({
                  min: rt.type({ field: rt.string }),
                })
              ),
            }),
          ])
        )
      );

      expect(
        runDecode(codec, {
          aggName: { filter: { field: 'hi' }, aggs: { aggNewName: { min: { field: 'low' } } } },
        })
      ).toEqual(['No errors!']);
    });
  });

  describe('Errors', () => {
    test('throw error when you add an attributes who is not expected for Record<String, Partial>', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.partial({
            max: rt.type({ field: rt.string }),
          })
        )
      );

      expect(runDecode(codec, { aggName: { max: { field: 'hi', script: '' } } })).toEqual([
        'Invalid value {"aggName":{"max":{"field":"hi","script":""}}}, excess properties: ["script"]',
      ]);
    });

    test('throw error when you add an attributes who is not expected for Record<String, Intersection>', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.intersection([
            rt.partial({
              max: rt.type({ field: rt.string }),
            }),
            rt.partial({
              min: rt.type({ field: rt.string }),
            }),
          ])
        )
      );

      expect(runDecode(codec, { aggName: { min: { field: 'hi', script: 'field' } } })).toEqual([
        'Invalid value {"aggName":{"min":{"field":"hi","script":"field"}}}, excess properties: ["script"]',
      ]);
    });

    test('throw error when you do not match types for Record<String, Partial>', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.partial({
            max: rt.type({ field: rt.string }),
          })
        )
      );

      expect(runDecode(codec, { aggName: { max: { field: 33 } } })).toEqual([
        'Invalid value 33 supplied to : { [K in string]: Partial<{ max: { field: string } }> }/aggName: Partial<{ max: { field: string } }>/max: { field: string }/field: string',
      ]);
    });

    test('throw error when when you do not match types for Record<String, Intersection>', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.intersection([
            rt.partial({
              max: rt.type({ field: rt.string }),
            }),
            rt.partial({
              min: rt.type({ field: rt.string }),
            }),
          ])
        )
      );

      expect(runDecode(codec, { aggName: { min: { field: 33 } } })).toEqual([
        'Invalid value 33 supplied to : { [K in string]: (Partial<{ max: { field: string } }> & Partial<{ min: { field: string } }>) }/aggName: (Partial<{ max: { field: string } }> & Partial<{ min: { field: string } }>)/1: Partial<{ min: { field: string } }>/min: { field: string }/field: string',
      ]);
    });

    test('throw error when you add an attributes in your second agg who is not expected for Record<String, Intersection>', () => {
      const codec = excess(
        rt.record(
          rt.string,
          rt.intersection([
            rt.partial({
              max: rt.type({ field: rt.string }),
            }),
            rt.partial({
              filter: rt.type({ field: rt.string }),
              aggs: rt.record(
                rt.string,
                rt.partial({
                  min: rt.type({ field: rt.string }),
                })
              ),
            }),
          ])
        )
      );

      expect(
        runDecode(codec, {
          aggName: {
            filter: { field: 'hi' },
            aggs: { aggNewName: { min: { field: 'low' }, script: 'error' } },
          },
        })
      ).toEqual([
        'Invalid value {"aggName":{"filter":{"field":"hi"},"aggs":{"aggNewName":{"min":{"field":"low"},"script":"error"}}}}, excess properties: ["script"]',
      ]);
    });
  });
});
