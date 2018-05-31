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
const MigrationStatus = require('./migration_status');
const MigrationState = require('./migration_state');
const _ = require('lodash');

describe('MigrationState.status', () => {
  test('is migrating if the stored migrationState has a status of migrating', () => {
    expect(MigrationState.status([], { status: MigrationStatus.migrating }))
      .toEqual(MigrationStatus.migrating);
  });

  test('is migrated if checksums all match', () => {
    const currentState = { types: [{ type: 'a', checksum: 'abc111' }] };
    const storedState = _.cloneDeep(currentState);
    expect(MigrationState.status(currentState, storedState))
      .toEqual(MigrationStatus.migrated);
  });

  test('is out of date if a new type is added', () => {
    const currentState = {
      types: [
        { type: 'a', checksum: 'ca', migrationIds: ['1'] },
        { type: 'b', checksum: 'cb', migrationIds: ['2'] }
      ],
    };
    const storedState = {
      types: [
        { type: 'a', checksum: 'ca', migrationIds: ['1'] }
      ]
    };

    expect(MigrationState.status(currentState, storedState))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is out of date if a checksum changes', () => {
    const currentState = {
      types: [
        { type: 'a', checksum: 'ca', migrationIds: ['1'] },
      ],
    };
    const storedState = {
      types: [
        { type: 'a', checksum: 'cc', migrationIds: ['1'] }
      ]
    };

    expect(MigrationState.status(currentState, storedState))
      .toEqual(MigrationStatus.outOfDate);
  });

  test('is not out of date if a migration is disabled', () => {
    const currentState = {
      types: [
        { type: 'a', checksum: 'aa111', migrationIds: ['1'] },
      ],
    };
    const storedState = {
      types: [
        { type: 'a', checksum: 'aa111', migrationIds: ['1'] },
        { type: 'b', checksum: 'bb111', migrationIds: ['2'] },
      ],
    };

    expect(MigrationState.status(currentState, storedState))
      .toEqual(MigrationStatus.migrated);
  });

  test('throws error if migration ids are out of order', () => {
    const currentState = {
      types: [
        { type: 'a', checksum: 'aa111', migrationIds: ['1', '2'] },
      ],
    };
    const storedState = {
      types: [
        { type: 'a', checksum: 'bb111', migrationIds: ['2', '1'] },
      ],
    };

    expect(() => MigrationState.status(currentState, storedState))
      .toThrow(/migration order has changed/);
  });

  test('throws error if stored migration state is ahead of current migration state', () => {
    const currentState = {
      types: [
        { type: 'a', checksum: 'aa111', migrationIds: ['1'] },
      ],
    };
    const storedState = {
      types: [
        { type: 'a', checksum: 'bb111', migrationIds: ['1', '2'] },
      ],
    };

    expect(() => MigrationState.status(currentState, storedState))
      .toThrow(/has had 2 migrations applied to it, but only 1 migrations are known/);
  });
});

describe('MigrationState.build', () => {
  test('Migration state is predictable and consistent', () => {
    const plugins = [{
      id: 'a',
      mappings: {
        foo: { type: 'text' },
        bar: { type: 'integer' },
      },
      migrations: [{
        id: 'a1',
        type: 'foo',
      }, {
        id: 'a2',
        type: 'foo',
      }, {
        id: 'a3',
        type: 'bar',
      }],
    }];
    expect(MigrationState.build(plugins, 'index5'))
      .toMatchSnapshot();
  });

  test('Types are kept from previous migration state', () => {
    const previousState = {
      types: [{
        type: 'a',
        checksum: 'a1',
        migrationIds: ['m_a1', 'm_a2'],
      }, {
        type: 'b',
        checksum: 'b1',
        migrationIds: ['m_b1'],
      }]
    };
    const plugins = [{
      id: 'x',
      mappings: {
        b: { type: 'text' },
      },
      migrations: [{
        id: 'm_b1',
        type: 'b',
      }, {
        id: 'm_b2',
        type: 'b',
      }],
    }];
    expect(MigrationState.build(plugins, 'index-foo', previousState))
      .toMatchSnapshot();
  });

  test('Allows migrations for no-longer-defined types', () => {
    const plugins = [{
      id: 'x',
      mappings: {
        b: { type: 'text' },
      },
      migrations: [{
        id: 'm_b1',
        type: 'b',
      }, {
        id: 'm_a1',
        type: 'a',
      }],
    }];
    expect(MigrationState.build(plugins, 'index-baz'))
      .toMatchSnapshot();
  });

  test('checksums change if mappings change', () => {
    const state1 = MigrationState.build([{
      id: 'a',
      mappings: { foo: { type: 'text' } },
      migrations: [],
    }]);
    const state2 = MigrationState.build([{
      id: 'a',
      mappings: { foo: { type: 'keyword' } },
      migrations: [],
    }]);
    expect(_.map(state1.types, 'checksum'))
      .not.toEqual(_.map(state2.types, 'checksum'));
  });


  test('checksums change if migrations change', () => {
    const state1 = MigrationState.build([{
      id: 'a',
      mappings: { foo: { type: 'text' } },
      migrations: [],
    }]);
    const state2 = MigrationState.build([{
      id: 'a',
      mappings: { foo: { type: 'text' } },
      migrations: ['a'],
    }]);
    expect(_.map(state1.types, 'checksum'))
      .not.toEqual(_.map(state2.types, 'checksum'));
  });
});
