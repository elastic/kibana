import {
  Comparators
} from '@elastic/eui';

export const getPage = (data, pageIndex, pageSize, sort) => {
  let list = data;
  if (sort) {
    list = data.sort(Comparators.property(sort.field, Comparators.default(sort.direction)));
  }
  if (!pageIndex && !pageSize) {
    return {
      index: 0,
      size: list.length,
      items: list,
      totalRecordCount: list.length
    };
  }
  const from = pageIndex * pageSize;
  const items = list.slice(from, Math.min(from + pageSize, list.length));
  return {
    index: pageIndex,
    size: pageSize,
    items,
    totalRecordCount: list.length
  };
};

export const getTableOfRecordsState = (items, criteria) => {
  const page = getPage(items, criteria.page.index, criteria.page.size, criteria.sort);

  return {
    data: {
      records: page.items,
      totalRecordCount: page.totalRecordCount,
    },
    criteria: {
      page: {
        index: page.index,
        size: page.size
      },
      sort: criteria.sort,
    }
  };
};

export const DEFAULT_TABLE_OF_RECORDS_STATE = {
  data: {
    records: [],
    totalRecordCount: 0,
  },
  criteria: {
    page: {
      index: 0,
      size: 10,
    },
    sort: {
      field: 'name',
      direction: 'asc',
    }
  }
};
