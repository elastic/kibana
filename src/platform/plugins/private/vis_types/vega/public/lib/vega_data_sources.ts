/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import { compact, isPlainObject, uniq, uniqBy } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EsqlSource, type FilterableSource } from '@kbn/data-source';
import { getSourceCommandQueryFromESQLQuery } from '@kbn/esql-utils';
import { getDataViews, getHttp } from '../services';
import { CONSTANTS } from '../data_model/types';
import type { UrlObject, VegaSpec } from '../data_model/types';

/** The ES|QL sources of a spec: one per query, and their datasets as filterable sources. */
export interface VegaEsqlSources {
  /** The datasets of the queries, once each, in the order of the spec. */
  readonly filterableSources: readonly FilterableSource[];
  /** The source of an ES|QL query of the spec; none when it reads no dataset or failed to resolve. */
  getSource(query: string): EsqlSource | undefined;
}

export const NO_ESQL_SOURCES: VegaEsqlSources = {
  filterableSources: [],
  getSource: () => undefined,
};

const isEsqlDataUrl = (url: UrlObject): url is UrlObject & { query: string } =>
  url[CONSTANTS.TYPE] === 'esql' && typeof url.query === 'string';

/**
 * Recursively collects the `url` objects of every data source in a Vega/Vega-Lite spec.
 *
 * `data` can be nested anywhere in the spec (e.g. inside `spec`, `layer`, `concat`,
 * `hconcat`, `vconcat`, `facet`, ...), so this mirrors the traversal that the Vega parser
 * itself performs in `_findObjectDataUrls`: any object located under a `data` key that has
 * a plain-object `url` is treated as a data source.
 */
const collectDataUrls = (node: unknown, parentKey?: string, accumulator: UrlObject[] = []) => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectDataUrls(child, parentKey, accumulator));
  } else if (isPlainObject(node)) {
    const obj = node as Record<string, unknown>;
    if (parentKey === 'data' && isPlainObject(obj.url)) {
      accumulator.push(obj.url as UrlObject);
    } else {
      Object.keys(obj).forEach((key) => collectDataUrls(obj[key], key, accumulator));
    }
  }

  return accumulator;
};

const resolveEsqlSource = async (query: string): Promise<EsqlSource | undefined> => {
  // A query without a source command (e.g. `ROW`) reads no dataset.
  if (!getSourceCommandQueryFromESQLQuery(query)) return undefined;
  try {
    return await EsqlSource.forDataset({ query, http: getHttp() });
  } catch {
    return undefined;
  }
};

const toFilterableSource = async (source: EsqlSource): Promise<FilterableSource | undefined> => {
  try {
    return await source.toFilterableSource(getHttp());
  } catch {
    return undefined;
  }
};

/** Resolves the ES|QL data urls of a spec. A query that fails to resolve is left out, the others stay. */
export const resolveVegaEsqlSources = async (spec: VegaSpec): Promise<VegaEsqlSources> => {
  const queries = uniq(
    collectDataUrls(spec)
      .filter(isEsqlDataUrl)
      .map(({ query }) => query)
  );
  if (!queries.length) return NO_ESQL_SOURCES;

  const sources = await Promise.all(queries.map(resolveEsqlSource));
  const sourcesByQuery = new Map(queries.map((query, index) => [query, sources[index]]));
  const filterableSources = await Promise.all(compact(sources).map(toFilterableSource));

  return {
    filterableSources: uniqBy(compact(filterableSources), 'id'),
    getSource: (query) => sourcesByQuery.get(query),
  };
};

/** {@link resolveVegaEsqlSources} of the text of a spec; a spec that doesn't parse has none. */
export const resolveVegaEsqlSourcesOfText = async (specText: string): Promise<VegaEsqlSources> => {
  let spec: VegaSpec;
  try {
    spec = parse(specText, { legacyRoot: false, keepWsc: true });
  } catch {
    return NO_ESQL_SOURCES;
  }
  return resolveVegaEsqlSources(spec);
};

const findIndexDataView = async (index: string): Promise<DataView[]> => {
  try {
    return await getDataViews().find(index, 1);
  } catch {
    return [];
  }
};

/**
 * The data sources of a spec: the data views of its `index` data urls, then the datasets of its ES|QL
 * data urls. `esqlSources` are the already resolved ES|QL sources of the spec, when the caller holds them.
 */
export const resolveVegaDataSources = async (
  spec: VegaSpec,
  esqlSources?: Promise<VegaEsqlSources>
): Promise<FilterableSource[]> => {
  const indexes = collectDataUrls(spec).flatMap(({ index }) =>
    typeof index === 'string' && index ? [index] : []
  );
  const [indexDataViews, { filterableSources }] = await Promise.all([
    Promise.all(indexes.map(findIndexDataView)),
    esqlSources ?? resolveVegaEsqlSources(spec),
  ]);
  return uniqBy([...indexDataViews.flat(), ...filterableSources], 'id');
};

/** {@link resolveVegaDataSources} of the text of a spec; a spec that doesn't parse has none. */
export const resolveVegaDataSourcesOfText = async (
  specText: string
): Promise<FilterableSource[]> => {
  let spec: VegaSpec;
  try {
    spec = parse(specText, { legacyRoot: false, keepWsc: true });
  } catch {
    return [];
  }
  return resolveVegaDataSources(spec);
};
