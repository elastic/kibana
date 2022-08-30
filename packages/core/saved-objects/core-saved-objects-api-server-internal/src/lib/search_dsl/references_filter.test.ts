/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getReferencesFilter } from './references_filter';

describe('getReferencesFilter', () => {
  const nestedRefMustClauses = (nestedMustClauses: unknown[]) => ({
    nested: {
      path: 'references',
      query: {
        bool: {
          must: nestedMustClauses,
        },
      },
    },
  });

  describe('when using the `OR` operator', () => {
    it('generates one `should` clause per type of reference', () => {
      const references = [
        { type: 'foo', id: 'foo-1' },
        { type: 'foo', id: 'foo-2' },
        { type: 'foo', id: 'foo-3' },
        { type: 'bar', id: 'bar-1' },
        { type: 'bar', id: 'bar-2' },
      ];
      const clause = getReferencesFilter({
        references,
        operator: 'OR',
      });

      expect(clause).toEqual({
        bool: {
          should: [
            nestedRefMustClauses([
              { terms: { 'references.id': ['foo-1', 'foo-2', 'foo-3'] } },
              { term: { 'references.type': 'foo' } },
            ]),
            nestedRefMustClauses([
              { terms: { 'references.id': ['bar-1', 'bar-2'] } },
              { term: { 'references.type': 'bar' } },
            ]),
          ],
          minimum_should_match: 1,
        },
      });
    });

    it('does not include mode than `maxTermsPerClause` per `terms` clauses', () => {
      const references = [
        { type: 'foo', id: 'foo-1' },
        { type: 'foo', id: 'foo-2' },
        { type: 'foo', id: 'foo-3' },
        { type: 'foo', id: 'foo-4' },
        { type: 'foo', id: 'foo-5' },
        { type: 'bar', id: 'bar-1' },
        { type: 'bar', id: 'bar-2' },
        { type: 'bar', id: 'bar-3' },
        { type: 'dolly', id: 'dolly-1' },
      ];
      const clause = getReferencesFilter({
        references,
        operator: 'OR',
        maxTermsPerClause: 2,
      });

      expect(clause).toEqual({
        bool: {
          should: [
            nestedRefMustClauses([
              { terms: { 'references.id': ['foo-1', 'foo-2'] } },
              { term: { 'references.type': 'foo' } },
            ]),
            nestedRefMustClauses([
              { terms: { 'references.id': ['foo-3', 'foo-4'] } },
              { term: { 'references.type': 'foo' } },
            ]),
            nestedRefMustClauses([
              { terms: { 'references.id': ['foo-5'] } },
              { term: { 'references.type': 'foo' } },
            ]),
            nestedRefMustClauses([
              { terms: { 'references.id': ['bar-1', 'bar-2'] } },
              { term: { 'references.type': 'bar' } },
            ]),
            nestedRefMustClauses([
              { terms: { 'references.id': ['bar-3'] } },
              { term: { 'references.type': 'bar' } },
            ]),
            nestedRefMustClauses([
              { terms: { 'references.id': ['dolly-1'] } },
              { term: { 'references.type': 'dolly' } },
            ]),
          ],
          minimum_should_match: 1,
        },
      });
    });
  });

  describe('when using the `AND` operator', () => {
    it('generates one `must` clause per reference', () => {
      const references = [
        { type: 'foo', id: 'foo-1' },
        { type: 'foo', id: 'foo-2' },
        { type: 'bar', id: 'bar-1' },
      ];

      const clause = getReferencesFilter({
        references,
        operator: 'AND',
      });

      expect(clause).toEqual({
        bool: {
          must: references.map((ref) => ({
            nested: {
              path: 'references',
              query: {
                bool: {
                  must: [
                    { term: { 'references.id': ref.id } },
                    { term: { 'references.type': ref.type } },
                  ],
                },
              },
            },
          })),
        },
      });
    });
  });

  it('defaults to using the `OR` operator', () => {
    const references = [
      { type: 'foo', id: 'foo-1' },
      { type: 'bar', id: 'bar-1' },
    ];
    const clause = getReferencesFilter({
      references,
    });

    expect(clause).toEqual({
      bool: {
        should: [
          nestedRefMustClauses([
            { terms: { 'references.id': ['foo-1'] } },
            { term: { 'references.type': 'foo' } },
          ]),
          nestedRefMustClauses([
            { terms: { 'references.id': ['bar-1'] } },
            { term: { 'references.type': 'bar' } },
          ]),
        ],
        minimum_should_match: 1,
      },
    });
  });
});
