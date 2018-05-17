import expect from 'expect.js';
import { findRelationships } from '../management/saved_objects/relationships';

describe('findRelationships', () => {
  it('should find relationships for dashboards', async () => {
    const type = 'dashboard';
    const id = 'foo';
    const size = 10;
    const callCluster = () => ({
      docs: [
        {
          _id: 'visualization:1',
          found: true,
          _source: {
            visualization: {
              title: 'Foo',
            },
          },
        },
        {
          _id: 'visualization:2',
          found: true,
          _source: {
            visualization: {
              title: 'Bar',
            },
          },
        },
        {
          _id: 'visualization:3',
          found: true,
          _source: {
            visualization: {
              title: 'FooBar',
            },
          },
        },
      ],
    });

    const savedObjectsClient = {
      _index: '.kibana',
      get: () => ({
        attributes: {
          panelsJSON: JSON.stringify([{ id: '1' }, { id: '2' }, { id: '3' }]),
        },
      }),
    };
    const result = await findRelationships(
      type,
      id,
      size,
      callCluster,
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
    const callCluster = () => ({
      hits: {
        hits: [
          {
            _id: 'dashboard:1',
            found: true,
            _source: {
              dashboard: {
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
          },
          {
            _id: 'dashboard:2',
            found: true,
            _source: {
              dashboard: {
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
          },
        ],
      },
    });

    const savedObjectsClient = {
      _index: '.kibana',
    };

    const result = await findRelationships(
      type,
      id,
      size,
      callCluster,
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
    const callCluster = () => ({
      hits: {
        hits: [
          {
            _id: 'visualization:1',
            found: true,
            _source: {
              visualization: {
                title: 'Foo',
              },
            },
          },
          {
            _id: 'visualization:2',
            found: true,
            _source: {
              visualization: {
                title: 'Bar',
              },
            },
          },
          {
            _id: 'visualization:3',
            found: true,
            _source: {
              visualization: {
                title: 'FooBar',
              },
            },
          },
        ],
      },
    });

    const savedObjectsClient = {
      _index: '.kibana',
      get: type => {
        if (type === 'search') {
          return {
            id: 'search:1',
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
    };

    const result = await findRelationships(
      type,
      id,
      size,
      callCluster,
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
    const callCluster = (endpoint, options) => {
      if (options._source[0] === 'visualization.title') {
        return {
          hits: {
            hits: [
              {
                _id: 'visualization:1',
                found: true,
                _source: {
                  visualization: {
                    title: 'Foo',
                    kibanaSavedObjectMeta: {
                      searchSourceJSON: JSON.stringify({
                        index: 'foo',
                      }),
                    },
                  },
                },
              },
              {
                _id: 'visualization:2',
                found: true,
                _source: {
                  visualization: {
                    title: 'Bar',
                    kibanaSavedObjectMeta: {
                      searchSourceJSON: JSON.stringify({
                        index: 'foo',
                      }),
                    },
                  },
                },
              },
              {
                _id: 'visualization:3',
                found: true,
                _source: {
                  visualization: {
                    title: 'FooBar',
                    kibanaSavedObjectMeta: {
                      searchSourceJSON: JSON.stringify({
                        index: 'foo2',
                      }),
                    },
                  },
                },
              },
            ],
          },
        };
      }

      return {
        hits: {
          hits: [
            {
              _id: 'search:1',
              found: true,
              _source: {
                search: {
                  title: 'Foo',
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      index: 'foo',
                    }),
                  },
                },
              },
            },
            {
              _id: 'search:2',
              found: true,
              _source: {
                search: {
                  title: 'Bar',
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      index: 'foo',
                    }),
                  },
                },
              },
            },
            {
              _id: 'search:3',
              found: true,
              _source: {
                search: {
                  title: 'FooBar',
                  kibanaSavedObjectMeta: {
                    searchSourceJSON: JSON.stringify({
                      index: 'foo2',
                    }),
                  },
                },
              },
            },
          ],
        },
      };
    };

    const savedObjectsClient = {
      _index: '.kibana',
    };

    const result = await findRelationships(
      type,
      id,
      size,
      callCluster,
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
