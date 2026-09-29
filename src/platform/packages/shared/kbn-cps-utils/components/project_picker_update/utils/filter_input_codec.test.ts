/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  FilterOperator,
  filterExpressionCodec,
  getFilterExpressionLookupKey,
  isValidFilterExpression,
} from './filter_input_codec';

describe('filterExpressionCodec', () => {
  describe('decode', () => {
    it('decodes a plain value as equals', () => {
      expect(filterExpressionCodec.decode('env:prod')).toEqual({
        operator: FilterOperator.EQUALS,
        tagName: 'env',
        tagValue: 'prod',
      });
    });

    it('decodes a negated value as not-equals', () => {
      expect(filterExpressionCodec.decode('-env:prod')).toEqual({
        operator: FilterOperator.NOT_EQUALS,
        tagName: 'env',
        tagValue: 'prod',
      });
    });

    it('does not misread a value containing a comma as a list', () => {
      expect(filterExpressionCodec.decode('city:New York, NY')).toEqual({
        operator: FilterOperator.EQUALS,
        tagName: 'city',
        tagValue: 'New York, NY',
      });
    });

    it('decodes a bracketed value as a one-of list', () => {
      expect(filterExpressionCodec.decode('env:[prod,staging]')).toEqual({
        operator: FilterOperator.ONE_OF,
        tagName: 'env',
        tagValue: ['prod', 'staging'],
      });
    });

    it('decodes a negated bracketed value as a not-one-of list', () => {
      expect(filterExpressionCodec.decode('-env:[prod,staging]')).toEqual({
        operator: FilterOperator.NOT_ONE_OF,
        tagName: 'env',
        tagValue: ['prod', 'staging'],
      });
    });

    it('decodes the exists sentinel as an exists operator', () => {
      expect(filterExpressionCodec.decode('env:exists')).toEqual({
        operator: FilterOperator.EXISTS,
        tagName: 'env',
        tagValue: undefined,
      });
    });

    it('decodes a negated exists sentinel as a not-exists operator', () => {
      expect(filterExpressionCodec.decode('-env:exists')).toEqual({
        operator: FilterOperator.NOT_EXISTS,
        tagName: 'env',
        tagValue: undefined,
      });
    });

    it('does not misread a value that merely contains the word exists', () => {
      expect(filterExpressionCodec.decode('env:coexists')).toEqual({
        operator: FilterOperator.EQUALS,
        tagName: 'env',
        tagValue: 'coexists',
      });
    });
  });

  describe('encode', () => {
    it('encodes an equals filter', () => {
      expect(
        filterExpressionCodec.encode({
          operator: FilterOperator.EQUALS,
          tagName: 'env',
          tagValue: 'prod',
        })
      ).toBe('env:prod');
    });

    it('encodes a not-equals filter with a negation prefix', () => {
      expect(
        filterExpressionCodec.encode({
          operator: FilterOperator.NOT_EQUALS,
          tagName: 'env',
          tagValue: 'prod',
        })
      ).toBe('-env:prod');
    });

    it('encodes a one-of filter with a bracketed list', () => {
      expect(
        filterExpressionCodec.encode({
          operator: FilterOperator.ONE_OF,
          tagName: 'env',
          tagValue: ['prod', 'staging'],
        })
      ).toBe('env:[prod,staging]');
    });

    it('encodes a not-one-of filter with a negation prefix and bracketed list', () => {
      expect(
        filterExpressionCodec.encode({
          operator: FilterOperator.NOT_ONE_OF,
          tagName: 'env',
          tagValue: ['prod', 'staging'],
        })
      ).toBe('-env:[prod,staging]');
    });

    it('encodes an exists filter', () => {
      expect(
        filterExpressionCodec.encode({
          operator: FilterOperator.EXISTS,
          tagName: 'env',
          tagValue: undefined,
        })
      ).toBe('env:exists');
    });

    it('encodes a not-exists filter with a negation prefix', () => {
      expect(
        filterExpressionCodec.encode({
          operator: FilterOperator.NOT_EXISTS,
          tagName: 'env',
          tagValue: undefined,
        })
      ).toBe('-env:exists');
    });
  });

  describe('round-tripping', () => {
    const cases: Array<Parameters<typeof filterExpressionCodec.encode>[0]> = [
      { operator: FilterOperator.EQUALS, tagName: 'env', tagValue: 'prod' },
      { operator: FilterOperator.NOT_EQUALS, tagName: 'env', tagValue: 'prod' },
      { operator: FilterOperator.ONE_OF, tagName: 'env', tagValue: ['prod', 'staging'] },
      { operator: FilterOperator.NOT_ONE_OF, tagName: 'env', tagValue: ['prod', 'staging'] },
      { operator: FilterOperator.EXISTS, tagName: 'env', tagValue: undefined },
      { operator: FilterOperator.NOT_EXISTS, tagName: 'env', tagValue: undefined },
    ];

    it.each(cases)('recovers $operator after encode -> decode', (expression) => {
      expect(filterExpressionCodec.decode(filterExpressionCodec.encode(expression))).toEqual(
        expression
      );
    });
  });
});

describe('getFilterExpressionLookupKey', () => {
  it('returns the encoded filter string', () => {
    const expression = {
      operator: FilterOperator.EQUALS,
      tagName: 'env',
      tagValue: 'prod',
    } as const;

    expect(getFilterExpressionLookupKey(expression)).toBe(filterExpressionCodec.encode(expression));
  });

  it('returns different keys for different expressions', () => {
    const a = {
      operator: FilterOperator.EQUALS,
      tagName: 'env',
      tagValue: 'prod',
    } as const;
    const b = {
      operator: FilterOperator.NOT_EQUALS,
      tagName: 'env',
      tagValue: 'prod',
    } as const;

    expect(getFilterExpressionLookupKey(a)).not.toBe(getFilterExpressionLookupKey(b));
  });
});

describe('isValidFilterExpression', () => {
  it('accepts a complete equals expression', () => {
    expect(
      isValidFilterExpression({ operator: FilterOperator.EQUALS, tagName: 'env', tagValue: 'prod' })
    ).toBe(true);
  });

  it('rejects a draft missing an operator', () => {
    expect(isValidFilterExpression({ tagName: 'env', tagValue: 'prod' })).toBe(false);
  });

  it('rejects a draft missing a tag name', () => {
    expect(isValidFilterExpression({ operator: FilterOperator.EQUALS, tagValue: 'prod' })).toBe(
      false
    );
  });

  it('rejects an equals draft missing a value', () => {
    expect(isValidFilterExpression({ operator: FilterOperator.EQUALS, tagName: 'env' })).toBe(
      false
    );
  });

  it('rejects an equals draft whose value is an empty string', () => {
    expect(
      isValidFilterExpression({ operator: FilterOperator.EQUALS, tagName: 'env', tagValue: '' })
    ).toBe(false);
  });

  it('rejects an equals draft whose value is an array instead of a string', () => {
    expect(
      isValidFilterExpression({
        operator: FilterOperator.EQUALS,
        tagName: 'env',
        tagValue: ['prod'],
      })
    ).toBe(false);
  });

  it('accepts a complete one-of expression', () => {
    expect(
      isValidFilterExpression({
        operator: FilterOperator.ONE_OF,
        tagName: 'env',
        tagValue: ['prod', 'staging'],
      })
    ).toBe(true);
  });

  it('rejects a one-of draft with an empty list', () => {
    expect(
      isValidFilterExpression({ operator: FilterOperator.ONE_OF, tagName: 'env', tagValue: [] })
    ).toBe(false);
  });

  it('rejects a one-of draft whose value is a string instead of an array', () => {
    expect(
      isValidFilterExpression({ operator: FilterOperator.ONE_OF, tagName: 'env', tagValue: 'prod' })
    ).toBe(false);
  });

  it('accepts a complete exists expression with no value', () => {
    expect(
      isValidFilterExpression({
        operator: FilterOperator.EXISTS,
        tagName: 'env',
        tagValue: undefined,
      })
    ).toBe(true);
  });

  it('rejects an exists draft that carries a value', () => {
    expect(
      isValidFilterExpression({ operator: FilterOperator.EXISTS, tagName: 'env', tagValue: 'prod' })
    ).toBe(false);
  });
});
