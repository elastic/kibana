import { convertFilterToEsDsl } from './convert';

describe('SavedObjectsClient/experimentalFilter', () => {
  it('properly converts complex example', () => {
    expect(convertFilterToEsDsl(['visualize', 'dashboard'], ['type', 'updated_at'], {
      must: [
        // numeric ranges
        { field: 'stars', gt: 3 },
        { field: 'followers', lte: 5 },

        // date ranges
        { field: 'updated_at', gte: '2018-03-02T00:00:00-07:00', lt: '2018-03-03T00:00:00-07:00' },
        { field: 'updated_at', gte: '2018-02-25T00:00:00-07:00', lt: '2018-03-01T00:00:00-07:00' },
        { field: 'updated_at', lt: '2012-01-01T00:00:00-07:00' },

        // match, field not required
        { value: 'dashboard' },
        { field: 'active', value: true },

        // bools can be nested
        {
          must_some: [
            // today
            { field: 'updated_at', gte: '2018-03-02T00:00:00-07:00', lt: '2018-03-03T00:00:00-07:00' },
            // yesterday
            { field: 'updated_at', gte: '2018-03-01T00:00:00-07:00', lt: '2018-03-02T00:00:00-07:00' }
          ]
        }
      ],
      must_not: [
        { field: 'status', value: 'open' },
        { field: 'owner', value: 'dewey' },
        {
          must_some: [
            { field: 'tag', value: 'finance' },
            { field: 'tag', value: 'eng' },
            { field: 'tag', value: 'ga' }
          ]
        }
      ]
    })).toMatchSnapshot();
  });
});
