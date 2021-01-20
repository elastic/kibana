/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
