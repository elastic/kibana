/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

describe('function validation', () => {
  describe('parameter validation', () => {
    it('accepts arguments of the correct type', () => {
      // straight call
      // assignment
      // nested function
      // inline cast
      // field
      // literal
    });

    it('accepts nulls by default', () => {});

    it('rejects arguments of an incorrect type', () => {});

    it('validates argument count', () => {
      // too many
      // too few
    });

    it('validates wildcards', () => {});

    it('casts strings to dates', () => {});

    it('enforces constant-only parameters', () => {
      // testErrorsAndWarnings('from a_index | stats percentile(doubleField, doubleField)', [
      //   'Argument of [percentile] must be a constant, received [doubleField]',
      // ]);
      // testErrorsAndWarnings(
      //   'from a_index | stats var = round(percentile(doubleField, doubleField))',
      //   [
      //     'Argument of [=] must be a constant, received [round(percentile(doubleField,doubleField))]',
      //   ]
      // );
    });
  });

  describe('function type support', () => {
    it('does not allow aggregations outside of STATS', () => {
      // SORT
      // WHERE
      // EVAL
    });
    it('allows scalar functions in all contexts', () => {
      // SORT
      // WHERE
      // EVAL
      // STATS
      // ROW
    });
  });

  describe('nested functions', () => {
    it('supports deep nesting', () => {});
    it("doesn't allow nested aggregation functions", () => {});
  });
});
