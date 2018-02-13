import {
  getTableOfRecordsState,
} from '../table';

jest.mock('@elastic/eui', () => ({
  Comparators: {
    property: () => {},
    default: () => {},
  },
}));

const items = [
  { displayName: 'Kibana' },
  { displayName: 'Elasticsearch' },
  { displayName: 'Logstash' },
];

describe('getTableOfRecordsState', () => {
  it('should return a TableOfRecords model', () => {
    const model = getTableOfRecordsState(items, {
      page: {
        index: 0,
        size: 10,
      },
      sort: {
        field: 'displayName',
        direction: 'asc',
      },
    });

    expect(model).toEqual({
      data: {
        records: items,
        totalRecordCount: items.length,
      },
      criteria: {
        page: {
          index: 0,
          size: 10
        },
        sort: {
          field: 'displayName',
          direction: 'asc'
        },
      }
    });
  });

  it('should paginate', () => {
    const model = getTableOfRecordsState(items, {
      page: {
        index: 1,
        size: 1,
      },
      sort: {
        field: 'displayName',
        direction: 'asc',
      },
    });

    expect(model).toEqual({
      data: {
        records: [{ displayName: 'Elasticsearch' }],
        totalRecordCount: items.length,
      },
      criteria: {
        page: {
          index: 1,
          size: 1
        },
        sort: {
          field: 'displayName',
          direction: 'asc'
        },
      }
    });
  });
});
