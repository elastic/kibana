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
  { name: 'Kibana' },
  { name: 'Elasticsearch' },
  { name: 'Logstash' },
];

describe('getTableOfRecordsState', () => {
  it('should return a TableOfRecords model', () => {
    const model = getTableOfRecordsState(items, {
      page: {
        index: 0,
        size: 10,
      },
      sort: {
        field: 'name',
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
          field: 'name',
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
        field: 'name',
        direction: 'asc',
      },
    });

    expect(model).toEqual({
      data: {
        records: [{ name: 'Elasticsearch' }],
        totalRecordCount: items.length,
      },
      criteria: {
        page: {
          index: 1,
          size: 1
        },
        sort: {
          field: 'name',
          direction: 'asc'
        },
      }
    });
  });
});
