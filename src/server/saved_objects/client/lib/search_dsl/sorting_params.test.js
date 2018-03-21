import { getSortingParams } from './sorting_params';

const MAPPINGS = {
  rootType: {
    properties: {
      pending: {
        properties: {
          title: {
            type: 'text',
          }
        }
      },
      saved: {
        properties: {
          title: {
            type: 'text',
            fields: {
              raw: {
                type: 'keyword'
              }
            }
          },
          obj: {
            properties: {
              key1: {
                type: 'text'
              }
            }
          }
        }
      }
    }
  }
};

describe('searchDsl/getSortParams', () => {
  describe('no sortField, type, or order', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS))
        .toEqual({});
    });
  });

  describe('type, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'pending'))
        .toEqual({});
    });
  });

  describe('type, order, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'saved', null, 'desc'))
        .toEqual({});
    });
  });

  describe('search field no direction', () => {
    describe('search field is simple property', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title'))
          .toEqual({
            sort: [
              {
                'saved.title': {
                  order: undefined,
                  unmapped_type: 'text'
                }
              }
            ]
          });
      });
    });
    describe('search field is multi-field', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw'))
          .toEqual({
            sort: [
              {
                'saved.title.raw': {
                  order: undefined,
                  unmapped_type: 'keyword'
                }
              }
            ]
          });
      });
    });
  });

  describe('search with direction', () => {
    describe('search field is simple property', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title', 'desc'))
          .toEqual({
            sort: [
              {
                'saved.title': {
                  order: 'desc',
                  unmapped_type: 'text'
                }
              }
            ]
          });
      });
    });
    describe('search field is multi-field', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw', 'asc'))
          .toEqual({
            sort: [
              {
                'saved.title.raw': {
                  order: 'asc',
                  unmapped_type: 'keyword'
                }
              }
            ]
          });
      });
    });
  });
});
