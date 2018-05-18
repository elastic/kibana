import { getSortingParams } from './sorting_params';

const MAPPINGS = {
  rootType: {
    properties: {
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
    describe('sortField is simple property', () => {
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
    describe('sortFields are simple properties', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title'))
          .toEqual({
            sort: [
              {
                'saved.title': {
                  order: undefined,
                  unmapped_type: 'text'
                }
              },
              {
                'pending.title': {
                  order: undefined,
                  unmapped_type: 'text'
                }
              }
            ]
          });
      });
    });
    describe('sortField is multi-field', () => {
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
    describe('sortFields are multi-field', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw'))
          .toEqual({
            sort: [
              {
                'saved.title.raw': {
                  order: undefined,
                  unmapped_type: 'keyword'
                }
              },
              {
                'pending.title.raw': {
                  order: undefined,
                  unmapped_type: 'keyword'
                }
              }
            ]
          });
      });
    });
  });

  describe('sort with direction', () => {
    describe('sortField is simple property', () => {
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
    describe('sortFields are simple property', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title', 'desc'))
          .toEqual({
            sort: [
              {
                'saved.title': {
                  order: 'desc',
                  unmapped_type: 'text'
                }
              },
              {
                'pending.title': {
                  order: 'desc',
                  unmapped_type: 'text'
                }
              }
            ]
          });
      });
    });
    describe('sortField is multi-field', () => {
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
    describe('sortField are multi-fields', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, ['saved', 'pending'], 'title.raw', 'asc'))
          .toEqual({
            sort: [
              {
                'saved.title.raw': {
                  order: 'asc',
                  unmapped_type: 'keyword'
                }
              },
              {
                'pending.title.raw': {
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
