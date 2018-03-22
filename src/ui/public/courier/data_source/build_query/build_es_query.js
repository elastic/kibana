import { groupBy, has } from 'lodash';
import { DecorateQueryProvider } from '../_decorate_query';
import { buildQueryFromKuery } from './from_kuery';
import { buildQueryFromFilters } from './from_filters';
import { buildQueryFromLucene } from './from_lucene';

export function BuildESQueryProvider(Private, config) {
  const decorateQuery = Private(DecorateQueryProvider);

  /**
   *
   * @param queries - an array of query objects. Each query has a language property and a query property.
   * @param filters - an array of filter objects
   */
  function buildESQuery(indexPattern, queries = [], filters = []) {
    const validQueries = queries.filter((query) => has(query, 'query'));
    const queriesByLanguage = groupBy(validQueries, 'language');

    const kueryQuery = buildQueryFromKuery(indexPattern, queriesByLanguage.kuery, config);
    const luceneQuery = buildQueryFromLucene(queriesByLanguage.lucene, decorateQuery);
    const filterQuery = buildQueryFromFilters(filters, decorateQuery, indexPattern);

    return {
      bool: {
        must: [].concat(kueryQuery.must, luceneQuery.must, filterQuery.must),
        filter: [].concat(kueryQuery.filter, luceneQuery.filter, filterQuery.filter),
        should: [].concat(kueryQuery.should, luceneQuery.should, filterQuery.should),
        must_not: [].concat(kueryQuery.must_not, luceneQuery.must_not, filterQuery.must_not),
      }
    };
  }

  return buildESQuery;
}
