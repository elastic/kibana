/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { DataSource, EsqlSource, FilterableSource } from '@kbn/data-source';

const isEsqlSource = (source: DataSource): source is EsqlSource => source.kind === 'esql';

const isSameList = (a: FilterableSource[], b: FilterableSource[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

/**
 * What the filtering UI needs from the data sources an app passes. A DSL source is its `DataView`,
 * read as it is, so nothing is asynchronous or stored for it. An ES|QL source needs its schema, so
 * it is resolved asynchronously and missing from the result until then. Returns `undefined` when
 * no sources are given. The same array is returned for as long as its items are the same.
 */
export const useFilterableSources = (
  dataSources: DataSource[] | undefined,
  http: HttpStart
): FilterableSource[] | undefined => {
  const dataSourcesRef = useRef(dataSources);
  dataSourcesRef.current = dataSources;
  const previousRef = useRef<FilterableSource[]>();
  const [resolved, setResolved] = useState<{ key: string; byId: Map<string, FilterableSource> }>();

  // Callers pass a new array on every render, so a change is a change of the sources themselves.
  const key = dataSources
    ?.filter(isEsqlSource)
    .map(({ id }) => id)
    .join('|');

  useEffect(() => {
    const esqlSources = dataSourcesRef.current?.filter(isEsqlSource) ?? [];
    if (key === undefined || esqlSources.length === 0) {
      return;
    }
    let cancelled = false;
    Promise.all(esqlSources.map((source) => source.toFilterableSource(http))).then((filterable) => {
      if (!cancelled) {
        setResolved({ key, byId: new Map(esqlSources.map(({ id }, i) => [id, filterable[i]])) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, http]);

  if (!dataSources) {
    return undefined;
  }

  const current = dataSources.flatMap((source) => {
    if (!isEsqlSource(source)) {
      return [source.getDataView()];
    }
    const filterable = resolved && resolved.key === key ? resolved.byId.get(source.id) : undefined;
    return filterable ? [filterable] : [];
  });

  if (previousRef.current && isSameList(previousRef.current, current)) {
    return previousRef.current;
  }
  previousRef.current = current;
  return current;
};
