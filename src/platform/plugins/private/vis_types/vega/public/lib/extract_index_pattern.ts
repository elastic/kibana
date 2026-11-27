/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import { compact, flatten, isPlainObject, uniqBy } from 'lodash';
import type { DataViewBase } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EsqlSource, type FilterableSource } from '@kbn/data-source';
import {
  getESQLAdHocDataview,
  getIndexPatternFromESQLQuery,
  getSourceCommandQueryFromESQLQuery,
} from '@kbn/esql-utils';
import { getDataViews, getHttp } from '../services';

import { CONSTANTS } from '../data_model/types';
import type { UrlObject, VegaSpec } from '../data_model/types';

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

const findIndexDataViews = (urls: UrlObject[]): Array<Promise<DataView[]>> => {
  const dataViews = getDataViews();
  return urls.reduce<Array<Promise<DataView[]>>>((accumulator, url) => {
    if (url.index) {
      accumulator.push(dataViews.find(url.index, 1));
    }

    return accumulator;
  }, []);
};

const getEsqlQueries = (urls: UrlObject[]): string[] =>
  uniqBy(urls.filter(isEsqlDataUrl), (url) => getIndexPatternFromESQLQuery(url.query)).map(
    ({ query }) => query
  );

/** The sources of the ES|QL data urls of a spec, one per dataset. A query that fails to resolve is left out. */
export const extractEsqlSourcesFromSpec = async (spec: VegaSpec): Promise<FilterableSource[]> => {
  const sources = await Promise.all(
    getEsqlQueries(collectDataUrls(spec)).map(async (query) => {
      // A query without a source command (e.g. `ROW`) reads no dataset.
      if (!getSourceCommandQueryFromESQLQuery(query)) return undefined;
      try {
        const http = getHttp();
        const source = await EsqlSource.forDataset({ query, http });
        return await source.toFilterableSource(http);
      } catch {
        return undefined;
      }
    })
  );
  return uniqBy(compact(sources), 'id');
};

/** The data views of the `index` data urls of a spec, followed by the sources of its ES|QL data urls. */
export const extractDataSourcesFromSpec = async (spec: VegaSpec): Promise<FilterableSource[]> => {
  const [indexDataViews, esqlSources] = await Promise.all([
    Promise.all(findIndexDataViews(collectDataUrls(spec))),
    extractEsqlSourcesFromSpec(spec),
  ]);
  return uniqBy([...flatten(indexDataViews), ...esqlSources], 'id');
};

const getEsqlSourcesOfSpecText = async (specText: string): Promise<FilterableSource[]> => {
  try {
    return await extractEsqlSourcesFromSpec(parse(specText, { legacyRoot: false, keepWsc: true }));
  } catch {
    // A spec that doesn't parse names no sources; the parser reports it when it renders.
    return [];
  }
};

/** The source a filter id names: the dataset of an ES|QL query of the spec, otherwise the data view with that id. */
export const getFilterSourceOfSpec = async (
  specText: string,
  id: string
): Promise<DataViewBase | undefined> => {
  const esqlSources = await getEsqlSourcesOfSpecText(specText);
  const esqlSource = esqlSources.find((source) => source.id === id);
  return (
    esqlSource ??
    (await getDataViews()
      .get(id)
      .catch(() => undefined))
  );
};

/** The data views of a spec, with an ad hoc data view for each ES|QL dataset, for the legacy visualization type. */
export const extractIndexPatternsFromSpec = async (spec: VegaSpec) => {
  const urls = collectDataUrls(spec);
  const indexPatternPromises = findIndexDataViews(urls);

  const esqlDataViewPromises = getEsqlQueries(urls).map(async (query) => {
    const dataView = await getESQLAdHocDataview({
      dataViewsService: getDataViews(),
      query,
      http: getHttp(),
    });
    return [dataView];
  });

  const resolved = flatten<DataView>(
    await Promise.all([...indexPatternPromises, ...esqlDataViewPromises])
  );

  return uniqBy(resolved, 'id');
};
