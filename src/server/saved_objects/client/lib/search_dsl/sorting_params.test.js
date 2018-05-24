import { getSortingParams } from './sorting_params';

const MAPPINGS = {
  rootType: {
    properties: {
      type: {
        type: 'text',
        fields: {
          raw: {
            type: 'keyword'
          }
        }
      },
      pending: {
        properties: {
          title: {
            type: 'text',
            fields: {
              raw: {
                type: 'keyword'
              }
            }
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

  describe('sortField no direction', () => {
    describe('sortField is simple property with single type', () => {
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
    describe('sortField is simple root property with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type'))
          .toEqual({
            sort: [
              {
                'type': {
                  order: undefined,
                  unmapped_type: 'text'
                }
              }
            ]
          });
      });
    });
    describe('sortField is simple non-root property with multiple types', () => {
      it('returns correct params', () => {
        expect(() => getSortingParams(MAPPINGS, ['saved', 'pending'], 'title')).toThrowErrorMatchingSnapshot();
      });
    });
    describe('sortField is multi-field with single type', () => {
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
    describe('sortField is root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type.raw'))
          .toEqual({
            sort: [
              {
                'type.raw': {
                  order: undefined,
                  unmapped_type: 'keyword'
                }
              }
            ]
          });
      });
    });
    describe('sortField is not-root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(() => getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw')).toThrowErrorMatchingSnapshot();
      });
    });
  });

  describe('sort with direction', () => {
    describe('sortField is simple property with single type', () => {
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
    describe('sortField is root simple property with multiple type', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type', 'desc'))
          .toEqual({
            sort: [
              {
                'type': {
                  order: 'desc',
                  unmapped_type: 'text'
                }
              }
            ]
          });
      });
    });
    describe('sortFields is non-root simple property with multiple types', () => {
      it('returns correct params', () => {
        expect(() => getSortingParams(MAPPINGS, ['saved', 'pending'], 'title', 'desc')).toThrowErrorMatchingSnapshot();
      });
    });
    describe('sortField is multi-field with single type', () => {
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
    describe('sortField is root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'type.raw', 'asc'))
          .toEqual({
            sort: [
              {
                'type.raw': {
                  order: 'asc',
                  unmapped_type: 'keyword'
                }
              }
            ]
          });
      });
    });
    describe('sortField is non-root multi-field with multiple types', () => {
      it('returns correct params', () => {
        expect(() => getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw', 'asc')).toThrowErrorMatchingSnapshot();
      });
    });
  });
});
