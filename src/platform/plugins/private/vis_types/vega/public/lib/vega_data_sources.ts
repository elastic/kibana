/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compact, isPlainObject, uniq, uniqBy } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EsqlSource, type FilterableSource } from '@kbn/data-source';
import { getSourceCommandQueryFromESQLQuery } from '@kbn/esql-utils';
import { getDataViews, getHttp } from '../services';
import { parseSpec } from './editor_spec';
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

const resolveEsqlQuery = async (query: string) => {
  // A query without a source command (e.g. `ROW`) reads no dataset.
  if (!getSourceCommandQueryFromESQLQuery(query)) return undefined;
  try {
    const http = getHttp();
    const source = await EsqlSource.forDataset({ query, http });
    return { source, filterableSource: await source.toFilterableSource(http) };
  } catch {
    return undefined;
  }
};

/** Resolves the ES|QL data urls of a spec. A query that fails to resolve is left out, the others stay. */
export const resolveVegaEsqlSources = async (spec?: VegaSpec): Promise<VegaEsqlSources> => {
  const queries = uniq(
    collectDataUrls(spec)
      .filter(isEsqlDataUrl)
      .map(({ query }) => query)
  );
  if (!queries.length) return NO_ESQL_SOURCES;

  const resolved = await Promise.all(queries.map(resolveEsqlQuery));
  const sourcesByQuery = new Map(queries.map((query, index) => [query, resolved[index]?.source]));

  return {
    filterableSources: uniqBy(
      compact(resolved).map(({ filterableSource }) => filterableSource),
      'id'
    ),
    getSource: (query) => sourcesByQuery.get(query),
  };
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
  spec?: VegaSpec,
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

// The text of a spec is HJSON or JSON, which HJSON also parses.
const parseSpecText = (specText: string) => parseSpec({ format: 'hjson', value: specText });

/** {@link resolveVegaEsqlSources} of the text of a spec; a spec that doesn't parse has none. */
export const resolveVegaEsqlSourcesOfText = (specText: string): Promise<VegaEsqlSources> =>
  resolveVegaEsqlSources(parseSpecText(specText));

/** {@link resolveVegaDataSources} of the text of a spec; a spec that doesn't parse has none. */
export const resolveVegaDataSourcesOfText = (specText: string): Promise<FilterableSource[]> =>
  resolveVegaDataSources(parseSpecText(specText));
