import expect from 'expect.js';

import { getSortingParams } from '../sorting_params';

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
        .to.eql({});
    });
  });

  describe('type, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'pending'))
        .to.eql({});
    });
  });

  describe('type, order, no sortField', () => {
    it('returns no params', () => {
      expect(getSortingParams(MAPPINGS, 'saved', null, 'desc'))
        .to.eql({});
    });
  });

  describe('sortField no direction', () => {
    describe('sortField is _doc', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', '_doc'))
          .to.eql({
            sort: [
              {
                '_doc': {
                  order: undefined,
                }
              }
            ]
          });
      });
    });
    describe('sortField is simple property', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title'))
          .to.eql({
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
    describe('sortField is multi-field', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw'))
          .to.eql({
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
    describe('sortField is unknown', () => {
      it('throws 400 error', () => {
        expect(() => getSortingParams(MAPPINGS, 'saved', 'notarealfield'))
          .to.throwException((error) => {
            expect(error.message).to.contain('Unknown sort field');
            expect(error.output).to.have.property('statusCode', 400);
          });
      });
    });
  });

  describe('sortField direction', () => {
    describe('sortField is _doc', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', '_doc', 'asc'))
          .to.eql({
            sort: [
              {
                '_doc': {
                  order: 'asc',
                }
              }
            ]
          });
      });
    });
    describe('sortField is simple property', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title', 'desc'))
          .to.eql({
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
    describe('sortField is multi-field', () => {
      it('returns correct params', () => {
        expect(getSortingParams(MAPPINGS, 'saved', 'title.raw', 'asc'))
          .to.eql({
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
    describe('sortField is unknown', () => {
      it('throws 400 error', () => {
        expect(() => getSortingParams(MAPPINGS, 'saved', 'notarealfield', 'desc'))
          .to.throwException((error) => {
            expect(error.message).to.contain('Unknown sort field');
            expect(error.output).to.have.property('statusCode', 400);
          });
      });
    });
  });
});
