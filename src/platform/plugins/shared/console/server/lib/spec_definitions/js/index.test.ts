/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SpecDefinitionsService } from '../../../services';
import type { EndpointDefinition } from '../../../../common/types';

interface NameOrDefinitionAutocompleteRules {
  __any_of: Array<string | { type: { __one_of: string[] } }>;
}

describe('console query DSL autocomplete globals', () => {
  // `globals` holds the recursive autocomplete rule tree, which the service
  // itself types as `Record<string, any>`; `endpoints` keeps its real type.
  let globals: ReturnType<SpecDefinitionsService['asJson']>['globals'];
  let endpoints: EndpointDefinition;

  beforeAll(() => {
    const service = new SpecDefinitionsService();
    service.start({ endpointsAvailability: 'stack' });
    const json = service.asJson();
    globals = json.globals;
    endpoints = json.endpoints;
  });

  const getAnalyzeRules = () => {
    const rules = endpoints.analyze.data_autocomplete_rules;

    if (!rules) {
      throw new Error('Expected the analyze endpoint to define data_autocomplete_rules');
    }

    return rules;
  };

  const getNameSuggestions = ({ __any_of }: NameOrDefinitionAutocompleteRules) =>
    __any_of.filter((rule): rule is string => typeof rule === 'string');

  const getDefinitionTypeSuggestions = ({ __any_of }: NameOrDefinitionAutocompleteRules) =>
    __any_of.find((rule): rule is { type: { __one_of: string[] } } => typeof rule !== 'string')
      ?.type.__one_of ?? [];

  // Regression test for https://github.com/elastic/kibana/issues/188264:
  // filter context accepts the same query DSL as query context, so every
  // `filter` slot must resolve to the `query` global rules rather than the
  // removed legacy (Elasticsearch 1.x) filter DSL.
  describe('filter context (issue 188264)', () => {
    const queryLink = { __scope_link: 'GLOBAL.query' };

    it('does not register a legacy `filter` global rule set', () => {
      expect(globals).not.toHaveProperty('filter');
    });

    it('points bool.filter at the query rules', () => {
      expect(globals.query.bool.filter).toEqual([{ __scope_link: '.' }]);
    });

    it('points knn.filter at the query global rules', () => {
      expect(globals.query.knn.filter).toEqual(queryLink);
    });

    it('points query filter slots at the query global rules', () => {
      expect(globals.query.constant_score.filter).toEqual(queryLink);
      expect(globals.query.custom_filters_score.filters[0].filter).toEqual(queryLink);
      expect(globals.query.function_score.functions[0].filter).toEqual(queryLink);
    });

    it('keeps geo queries self-contained after removing the filter globals', () => {
      for (const geo of ['geo_shape', 'geo_bounding_box', 'geo_distance', 'geo_polygon']) {
        expect(globals.query[geo]).not.toHaveProperty('__scope_link');
        expect(globals.query[geo]).toHaveProperty('{field}');
      }
    });

    // These `filter` slots had empty rules ({}); their suggestions came from
    // the engine resolving the typed `filter` key against the global rule of
    // the same name (object_component.ts: globalComponentResolver(token)),
    // i.e. the legacy filter DSL. Deleting the `filter` global leaves them
    // suggesting nothing, so they must link to the query rules explicitly —
    // these are query-DSL slots in modern ES (`AggregationContainer.filter`
    // and `Alias.filter` are both `QueryContainer`).
    it('points the filter aggregation at the query global rules', () => {
      expect(globals.aggs['*'].filter).toEqual({ __scope_link: 'GLOBAL.query' });
      expect(globals.aggregations['*'].filter).toEqual({ __scope_link: 'GLOBAL.query' });
    });

    it('points alias filters at the query global rules', () => {
      expect(globals.aliases['*'].filter).toEqual(queryLink);
      expect(endpoints['indices.put_alias'].data_autocomplete_rules).toMatchObject({
        filter: queryLink,
      });
      expect(endpoints['indices.update_aliases'].data_autocomplete_rules).toMatchObject({
        actions: { __any_of: [{ add: { filter: queryLink } }] },
      });
    });
  });

  // The `put_mapping` rules predate the Elasticsearch 7.x removal of mapping
  // types, but its nested-object and multi-field scope links still pointed at
  // the removed `type` level (`put_mapping.type.properties`). That path no
  // longer exists in the rule tree, so sub-field autocomplete inside
  // `properties.<field>.properties` and `properties.<field>.fields` resolved
  // to nothing. The links must target the real top-level `properties` key.
  describe('put_mapping nested field scope links', () => {
    it('points nested object properties at the put_mapping properties rules', () => {
      expect(endpoints.put_mapping.data_autocomplete_rules).toMatchObject({
        properties: {
          '*': {
            properties: { __scope_link: 'put_mapping.properties' },
            fields: { '*': { __scope_link: 'put_mapping.properties.field' } },
          },
        },
      });
    });

    it('does not reference the removed mapping `type` level anywhere', () => {
      expect(JSON.stringify(endpoints.put_mapping.data_autocomplete_rules)).not.toContain(
        'put_mapping.type'
      );
    });
  });

  describe('WHEN generating put_mapping autocomplete rules', () => {
    const dynamicTemplateMatchTypeValues = [
      '*',
      'string',
      'object',
      'long',
      'double',
      'boolean',
      'date',
      'binary',
    ];

    it('SHOULD expose dynamic mapping and dynamic template suggestions', () => {
      expect(endpoints.put_mapping.data_autocomplete_rules).toMatchObject({
        dynamic: {
          __one_of: ['true', 'false', 'strict', 'runtime'],
        },
        dynamic_templates: [
          {
            '*': {
              mapping: expect.any(Object),
              runtime: expect.any(Object),
              match: '',
              match_pattern: {
                __one_of: ['simple', 'regex'],
              },
              match_mapping_type: {
                __one_of: [
                  {
                    __one_of: dynamicTemplateMatchTypeValues,
                  },
                  [
                    {
                      __one_of: dynamicTemplateMatchTypeValues,
                    },
                  ],
                ],
              },
              path_match: '',
              path_unmatch: '',
              unmatch: '',
              unmatch_mapping_type: {
                __one_of: [
                  {
                    __one_of: dynamicTemplateMatchTypeValues,
                  },
                  [
                    {
                      __one_of: dynamicTemplateMatchTypeValues,
                    },
                  ],
                ],
              },
            },
          },
        ],
      });
    });

    it('SHOULD link the generated indices.put_mapping endpoint to the put_mapping body rules', () => {
      expect(endpoints['indices.put_mapping'].data_autocomplete_rules).toEqual({
        __scope_link: 'put_mapping',
      });
    });
  });

  describe('WHEN registering the analyze endpoint autocomplete rules', () => {
    it('SHOULD include every analyze request body field', () => {
      expect(Object.keys(getAnalyzeRules()).sort()).toEqual([
        'analyzer',
        'attributes',
        'char_filter',
        'explain',
        'field',
        'filter',
        'normalizer',
        'text',
        'tokenizer',
      ]);
    });

    it('SHOULD suggest configured token filters only as object definitions', () => {
      const filterRules = getAnalyzeRules().filter as NameOrDefinitionAutocompleteRules;
      const definitionOnlyTypes = [
        'condition',
        'dictionary_decompounder',
        'hunspell',
        'hyphenation_decompounder',
        'keep',
        'keep_types',
        'keyword_marker',
        'pattern_capture',
        'pattern_replace',
        'predicate_token_filter',
        'stemmer_override',
        'synonym',
        'synonym_graph',
      ];

      expect(getNameSuggestions(filterRules)).not.toEqual(
        expect.arrayContaining(definitionOnlyTypes)
      );
      expect(getDefinitionTypeSuggestions(filterRules)).toEqual(
        expect.arrayContaining(definitionOnlyTypes)
      );
      expect(filterRules.__any_of).not.toContain('conditional');
      expect(getDefinitionTypeSuggestions(filterRules)).not.toContain('conditional');
    });

    it('SHOULD suggest configured char filters only as object definitions', () => {
      const charFilterRules = getAnalyzeRules().char_filter as NameOrDefinitionAutocompleteRules;

      expect(getNameSuggestions(charFilterRules)).toEqual(['html_strip']);
      expect(getDefinitionTypeSuggestions(charFilterRules)).toEqual([
        'html_strip',
        'mapping',
        'pattern_replace',
      ]);
    });

    it('SHOULD omit analyzer types that are not global analyzer names', () => {
      const analyzerRules = getAnalyzeRules().analyzer as { __one_of: string[] };

      expect(analyzerRules.__one_of).not.toEqual(expect.arrayContaining(['custom', 'nori']));
    });
  });
});
