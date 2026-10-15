/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flatten, isPlainObject, uniqBy } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
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

export const extractIndexPatternsFromSpec = async (spec: VegaSpec) => {
  const dataViews = getDataViews();
  const urls = collectDataUrls(spec);

  const indexPatternPromises = urls.reduce<Array<Promise<DataView[]>>>((accumulator, url) => {
    if (url.index) {
      accumulator.push(dataViews.find(url.index, 1));
    }

    return accumulator;
  }, []);

  const esqlUrls = urls.filter(isEsqlDataUrl);
  const esqlQueries = uniqBy(esqlUrls, (url) => getIndexPatternFromESQLQuery(url.query));

  const esqlDataViewPromises = esqlQueries.map(async ({ query }) => {
    const dataView = await getESQLAdHocDataview({
      dataViewsService: dataViews,
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
