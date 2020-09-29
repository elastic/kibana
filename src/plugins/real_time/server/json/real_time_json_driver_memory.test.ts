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

import { RealTimeJsonDriverMemory } from './real_time_json_driver_memory';
import { type, insertOp, Doc } from 'ot-json1';
import { RealTimeOperation } from './types';
import { of } from '../../../kibana_utils';

const setup = () => {
  const driver = new RealTimeJsonDriverMemory();
  const op = insertOp(['foo'], 'bar');
  const snapshot = type.apply({}, op) as Doc;
  const operation: RealTimeOperation = {
    type: 'type',
    id: 'id',
    op,
    prev: '',
    version: 0,
  };

  return { driver, op, snapshot, operation };
};

describe('RealTimeJsonDriverMemory', () => {
  test('can create a new document', async () => {
    const { driver, snapshot, operation } = setup();
    await driver.commit('type', 'id', operation, snapshot, { create: true });

    const snapshot2 = await driver.getSnapshot('type', 'id');

    expect(snapshot2).toEqual(snapshot);
    expect(snapshot2).not.toBe(snapshot);
  });

  test('throws if new document is created without "create" flag', async () => {
    const { driver, snapshot, operation } = setup();

    const [, error] = await of(driver.commit('type', 'id', operation, snapshot, { create: false }));

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchInlineSnapshot(`"NOT_FOUND"`);
  });

  test('throws if new document is created without operation sequence other than 0', async () => {
    const { driver, snapshot, operation } = setup();

    operation.version = 1;
    const [, error] = await of(driver.commit('type', 'id', operation, snapshot, { create: false }));

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchInlineSnapshot(`"NOT_FOUND"`);
  });

  test('can update the snapshot', async () => {
    const { driver, snapshot, operation } = setup();

    await driver.commit('type', 'id', operation, snapshot, { create: true });

    const op2 = insertOp(['x'], 'y');
    const operation2: RealTimeOperation = {
      type: 'type',
      id: 'id',
      op: op2,
      prev: '',
      version: 1,
    };

    const snapshot2 = type.apply(snapshot, op2)!;

    await driver.commit('type', 'id', operation2, snapshot2);

    const snapshot3 = await driver.getSnapshot('type', 'id');

    expect(snapshot3).toEqual({ foo: 'bar', x: 'y' });
    expect(snapshot3).not.toBe(snapshot2);
  });

  test('can retrieve all operations', async () => {
    const { driver, snapshot, operation } = setup();

    await driver.commit('type', 'id', operation, snapshot, { create: true });

    const op2 = insertOp(['x'], 'y');
    const operation2: RealTimeOperation = {
      type: 'type',
      id: 'id',
      op: op2,
      prev: '',
      version: 1,
    };

    const snapshot2 = type.apply(snapshot, op2)!;

    await driver.commit('type', 'id', operation2, snapshot2);

    const ops = await driver.getOps('type', 'id', 0);

    expect(ops.length).toBe(2);
    expect(ops).toMatchObject([operation, operation2]);
    expect(ops[0]).not.toBe(operation);
  });

  test('can retrieve subset of operations', async () => {
    const { driver, snapshot, operation } = setup();

    await driver.commit('type', 'id', operation, snapshot, { create: true });

    const op2 = insertOp(['x'], 'y');
    const operation2: RealTimeOperation = {
      type: 'type',
      id: 'id',
      op: op2,
      prev: '',
      version: 1,
    };

    const snapshot2 = type.apply(snapshot, op2)!;

    await driver.commit('type', 'id', operation2, snapshot2);

    const ops = await driver.getOps('type', 'id', 1);

    expect(ops.length).toBe(1);
    expect(ops).toMatchObject([operation2]);
  });
});
