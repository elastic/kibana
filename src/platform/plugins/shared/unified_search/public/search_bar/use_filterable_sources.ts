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
import type { DataSource, FilterableSource } from '@kbn/data-source';

/**
 * What the filtering UI needs from the data sources an app passes. A DSL source is its `DataView`
 * right away. An ES|QL source needs its schema, so it is resolved asynchronously and missing from
 * the result until then. Returns `undefined` when no sources are given.
 */
export const useFilterableSources = (
  dataSources: DataSource[] | undefined,
  http: HttpStart
): FilterableSource[] | undefined => {
  const dataSourcesRef = useRef(dataSources);
  dataSourcesRef.current = dataSources;
  const [resolved, setResolved] = useState<{ key: string; filterable: FilterableSource[] }>();

  // Callers pass a new array on every render, so a change is a change of the sources themselves.
  const key = dataSources?.map(({ id }) => id).join('|');

  useEffect(() => {
    const sources = dataSourcesRef.current;
    if (key === undefined || !sources) {
      return;
    }
    let cancelled = false;
    Promise.all(sources.map((source) => source.toFilterableSource(http))).then((filterable) => {
      if (!cancelled) {
        setResolved({ key, filterable });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key, http]);

  if (!dataSources) {
    return undefined;
  }
  if (resolved && resolved.key === key) {
    return resolved.filterable;
  }
  return dataSources.flatMap((source) =>
    source.kind === 'index-pattern' ? [source.getDataView()] : []
  );
};
