import {
  getItemsOnPage,
} from '..';

const items = [
  { name: 'Kibana' },
  { name: 'Elasticsearch' },
  { name: 'Logstash' },
];

describe('getItemsOnPage', () => {
  describe('by default', () => {
    it('returns the same items which were provided', () => {
      const itemsOnPage = getItemsOnPage(items);
      expect(itemsOnPage).toEqual(itemsOnPage);
    });
  });

  describe('with page arguments', () => {
    it('returns the items defined by the page arguments', () => {
      const pageIndex = 2;
      const pageSize = 1;
      const itemsOnPage = getItemsOnPage(items, pageIndex, pageSize);
      expect(itemsOnPage).toEqual([ items[2] ]);
    });
  });

  describe('with sort arguments', () => {
    it('returns the items defined by the sort arguments', () => {
      const sortField = 'name';
      const sortDirection = 'desc';
      const itemsOnPage = getItemsOnPage(items, undefined, undefined, sortField, sortDirection);
      expect(itemsOnPage).toEqual([ items[2], items[0], items[1] ]);
    });
  });

  describe('with page and sort arguments', () => {
    it('returns the items defined by the page and sort arguments', () => {
      const pageIndex = 0;
      const pageSize = 2;
      const sortField = 'name';
      const sortDirection = 'desc';
      const itemsOnPage = getItemsOnPage(items, pageIndex, pageSize, sortField, sortDirection);
      expect(itemsOnPage).toEqual([ items[2], items[0] ]);
    });
  });
});
