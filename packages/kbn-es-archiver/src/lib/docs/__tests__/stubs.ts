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

import { Client } from 'elasticsearch';
import sinon from 'sinon';
import Chance from 'chance';
import { times } from 'lodash';

import { Stats } from '../../stats';

const chance = new Chance();

export const createStubStats = (): Stats =>
  ({
    indexedDoc: sinon.stub(),
    archivedDoc: sinon.stub(),
  } as any);

export const createPersonDocRecords = (n: number) =>
  times(n, () => ({
    type: 'doc',
    value: {
      index: 'people',
      type: 'person',
      id: chance.natural(),
      source: {
        name: chance.name(),
        birthday: chance.birthday(),
        ssn: chance.ssn(),
      },
    },
  }));

type MockClient = Client & {
  assertNoPendingResponses: () => void;
};

export const createStubClient = (
  responses: Array<(name: string, params: any) => any | Promise<any>> = []
): MockClient => {
  const createStubClientMethod = (name: string) =>
    sinon.spy(async (params) => {
      if (responses.length === 0) {
        throw new Error(`unexpected client.${name} call`);
      }

      const response = responses.shift();
      return await response!(name, params);
    });

  return {
    search: createStubClientMethod('search'),
    scroll: createStubClientMethod('scroll'),
    bulk: createStubClientMethod('bulk'),

    assertNoPendingResponses() {
      if (responses.length) {
        throw new Error(`There are ${responses.length} unsent responses.`);
      }
    },
  } as any;
};
