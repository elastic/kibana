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

import expect from 'expect.js';
import { findRelationships } from '../management/saved_objects/relationships';

describe('findRelationships', () => {
  it('should find relationships for dashboards', async () => {
    const type = 'dashboard';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      _index: '.kibana',
      get: () => ({
        attributes: {
          panelsJSON: JSON.stringify([{ id: '1' }, { id: '2' }, { id: '3' }]),
        },
      }),
      bulkGet: () => ({
        saved_objects: [
          {
            id: '1',
            attributes: {
              title: 'Foo',
            },
          },
          {
            id: '2',
            attributes: {
              title: 'Bar',
            },
          },
          {
            id: '3',
            attributes: {
              title: 'FooBar',
            },
          },
        ],
      })
    };
    const result = await findRelationships(
      type,
      id,
      size,
      savedObjectsClient
    );
    expect(result).to.eql({
      visualizations: [
        { id: '1', title: 'Foo' },
        { id: '2', title: 'Bar' },
        { id: '3', title: 'FooBar' },
      ],
    });
  });

  it('should find relationships for visualizations', async () => {
    const type = 'visualization';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      find: () => ({
        saved_objects: [
          {
            id: '1',
            attributes: {
              title: 'My Dashboard',
              panelsJSON: JSON.stringify([
                {
                  type: 'visualization',
                  id,
                },
                {
                  type: 'visualization',
                  id: 'foobar',
                },
              ]),
            },
          },
          {
            id: '2',
            attributes: {
              title: 'Your Dashboard',
              panelsJSON: JSON.stringify([
                {
                  type: 'visualization',
                  id,
                },
                {
                  type: 'visualization',
                  id: 'foobar',
                },
              ]),
            },
          },
        ]
      })
    };

    const result = await findRelationships(
      type,
      id,
      size,
      savedObjectsClient
    );
    expect(result).to.eql({
      dashboards: [
        { id: '1', title: 'My Dashboard' },
        { id: '2', title: 'Your Dashboard' },
      ],
    });
  });

  it('should find relationships for saved searches', async () => {
    const type = 'search';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      get: type => {
        if (type === 'search') {
          return {
            id: '1',
            attributes: {
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-pattern:1',
                }),
              },
            },
          };
        }

        return {
          id: 'index-pattern:1',
          attributes: {
            title: 'My Index Pattern',
          },
        };
      },
      find: () => ({
        saved_objects: [
          {
            id: '1',
            attributes: {
              title: 'Foo',
            },
          },
          {
            id: '2',
            attributes: {
              title: 'Bar',
            },
          },
          {
            id: '3',
            attributes: {
              title: 'FooBar',
            },
          },
        ]
      })
    };

    const result = await findRelationships(
      type,
      id,
      size,
      savedObjectsClient
    );
    expect(result).to.eql({
      visualizations: [
        { id: '1', title: 'Foo' },
        { id: '2', title: 'Bar' },
        { id: '3', title: 'FooBar' },
      ],
      indexPatterns: [{ id: 'index-pattern:1', title: 'My Index Pattern' }],
    });
  });

  it('should find relationships for index patterns', async () => {
    const type = 'index-pattern';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      find: options => {
        if (options.type === 'visualization') {
          return {
            saved_objects: [
              {
                id: '1',
                found: true,
                attributes: {
                  title: 'Foo',
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      index: 'foo',
                    }),
                  },
                },
              },
              {
                id: '2',
                found: true,
                attributes: {
                  title: 'Bar',
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      index: 'foo',
                    }),
                  },
                },
              },
              {
                id: '3',
                found: true,
                attributes: {
                  title: 'FooBar',
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      index: 'foo2',
                    }),
                  },
                },
              },
            ]
          };
        }

        return {
          saved_objects: [
            {
              id: '1',
              attributes: {
                title: 'Foo',
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    index: 'foo',
                  }),
                },
              },
            },
            {
              id: '2',
              attributes: {
                title: 'Bar',
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    index: 'foo',
                  }),
                },
              },
            },
            {
              id: '3',
              attributes: {
                title: 'FooBar',
                kibanaSavedObjectMeta: {
                  searchSourceJSON: JSON.stringify({
                    index: 'foo2',
                  }),
                },
              },
            },
          ]
        };
      }
    };

    const result = await findRelationships(
      type,
      id,
      size,
      savedObjectsClient
    );
    expect(result).to.eql({
      visualizations: [{ id: '1', title: 'Foo' }, { id: '2', title: 'Bar' }],
      searches: [{ id: '1', title: 'Foo' }, { id: '2', title: 'Bar' }],
    });
  });

  it('should return an empty object for invalid types', async () => {
    const type = 'invalid';
    const result = await findRelationships(type);
    expect(result).to.eql({});
  });
});
