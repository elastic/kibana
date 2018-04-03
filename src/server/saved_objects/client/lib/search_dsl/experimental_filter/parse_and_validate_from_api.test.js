import { parseAndValidateFromApi } from './parse_and_validate_from_api';

describe('SavedObjectsClient experimental_filter/detect_types', () => {
  describe('value', () => {
    it('detects with just value', () => {
      expect(parseAndValidateFromApi({
        value: 'foo'
      })).toMatchSnapshot();
    });

    it('detects with value and field', () => {
      expect(parseAndValidateFromApi({
        field: 'foo',
        value: 'bar'
      })).toMatchSnapshot();
    });
  });

  describe('range', () => {
    it('detects with lt and field', () => {
      expect(parseAndValidateFromApi({
        field: 'foo',
        lt: 10
      })).toMatchSnapshot();
    });

    it('detects with lte and field', () => {
      expect(parseAndValidateFromApi({
        field: 'foo',
        lte: 100
      })).toMatchSnapshot();
    });

    it('detects with gt and field', () => {
      expect(parseAndValidateFromApi({
        field: 'foo',
        gt: 100,
      })).toMatchSnapshot();
    });

    it('detects with gte and field', () => {
      expect(parseAndValidateFromApi({
        field: 'foo',
        gte: 100
      })).toMatchSnapshot();
    });

    it('detects with lte, gt and field', () => {
      expect(parseAndValidateFromApi({
        field: 'foo',
        lte: 100,
        gt: 100
      })).toMatchSnapshot();
    });

    it('detects with gt, lt and field', () => {
      expect(parseAndValidateFromApi({
        field: 'foo',
        gt: 100,
        lt: 100,
      })).toMatchSnapshot();
    });
  });

  describe('bool', () => {
    it('detects with single must', () => {
      expect(parseAndValidateFromApi({
        must: [],
      })).toMatchSnapshot();
    });

    it('detects with single must_not', () => {
      expect(parseAndValidateFromApi({
        must_not: [],
      })).toMatchSnapshot();
    });

    it('detects with single must_some', () => {
      expect(parseAndValidateFromApi({
        must_some: [],
      })).toMatchSnapshot();
    });

    it('detects with must and must_not', () => {
      expect(parseAndValidateFromApi({
        must: [],
        must_not: [],
      })).toMatchSnapshot();
    });

    it('detects with must_not and must_some', () => {
      expect(parseAndValidateFromApi({
        must_not: [],
        must_some: [],
      })).toMatchSnapshot();
    });

    it('detects with must and must_some', () => {
      expect(parseAndValidateFromApi({
        must: [],
        must_some: [],
      })).toMatchSnapshot();
    });

    it('detects nested filter types', () => {
      expect(parseAndValidateFromApi({
        must: [
          { field: 'foo', value: 'bar' },
          {
            must_some: [
              { field: 'foo2', value: 'bar2' },
              { field: 'foo2', value: 'bar3' },
            ]
          }
        ],
      })).toMatchSnapshot();
    });
  });

  describe('errors', () => {
    it('errors with just lt', () => {
      expect(() => parseAndValidateFromApi({
        lt: 10
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors with just lte', () => {
      expect(() => parseAndValidateFromApi({
        lte: 100
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors with just gt', () => {
      expect(() => parseAndValidateFromApi({
        gt: 100,
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors with just gte', () => {
      expect(() => parseAndValidateFromApi({
        gte: 100
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors with lte and gt', () => {
      expect(() => parseAndValidateFromApi({
        lte: 100,
        gt: 100
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors with gt and lt', () => {
      expect(() => parseAndValidateFromApi({
        gt: 100,
        lt: 100,
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors if gt and value combined', () => {
      expect(() => parseAndValidateFromApi({
        field: 'foo',
        gt: 100,
        value: 'bar'
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors if gt and gte combined', () => {
      expect(() => parseAndValidateFromApi({
        field: 'foo',
        gt: 100,
        gte: 200
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors if gt and must combined', () => {
      expect(() => parseAndValidateFromApi({
        field: 'foo',
        gt: 100,
        must: []
      })).toThrowErrorMatchingSnapshot();
    });

    it('errors if only field', () => {
      expect(() => parseAndValidateFromApi({
        field: 'foo',
      })).toThrowErrorMatchingSnapshot();
    });
  });
});
