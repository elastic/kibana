/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { useStableCallback } from '@kbn/unified-histogram';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject, merge, withLatestFrom } from 'rxjs';

export const usePaginatedFields = ({
  fields,
  dimensions,
  pageSize,
  currentPage,
}: {
  fields: MetricField[];
  dimensions: string[];
  pageSize: number;
  currentPage: number;
}) => {
  const { fields$, dimensions$, currentPage$ } = useFieldsSubjects({
    fields,
    dimensions,
    currentPage,
  });

  const buildPaginatedFields = useCallback(() => {
    const allFields = fields$.value.filter(
      (field) =>
        !field.noData &&
        (dimensions$.value.length === 0 ||
          dimensions$.value.every((sel) => field.dimensions.some((d) => d.name === sel)))
    );

    const totalPages = Math.ceil(allFields.length / pageSize);

    const currentPageFields = allFields.slice(
      currentPage$.value * pageSize,
      currentPage$.value * pageSize + pageSize
    );

    return {
      allFields,
      currentPageFields,
      totalPages,
      dimensions: dimensions$.value,
    };
  }, [currentPage$.value, dimensions$.value, fields$.value, pageSize]);

  const [paginatedFieldsContext, setPaginatedFieldsContext] =
    useState<ReturnType<typeof buildPaginatedFields>>();

  const updateLensPropsContext = useStableCallback(() =>
    setPaginatedFieldsContext(buildPaginatedFields())
  );

  useEffect(() => {
    const subscription = merge(fields$, dimensions$, currentPage$)
      .pipe(withLatestFrom([fields$, dimensions$, currentPage$]))
      .subscribe(() => updateLensPropsContext());

    return () => subscription.unsubscribe();
  }, [fields$, dimensions$, currentPage$, updateLensPropsContext]);

  return useMemo(() => paginatedFieldsContext, [paginatedFieldsContext]);
};

function useFieldsSubjects({
  fields,
  dimensions,
  currentPage,
}: {
  fields: MetricField[];
  dimensions: string[];
  currentPage: number;
}) {
  const fields$ = useRef(new BehaviorSubject(fields));
  const dimensions$ = useRef(new BehaviorSubject(dimensions));
  const currentPage$ = useRef(new BehaviorSubject(currentPage));

  useEffect(() => {
    fields$.current.next(fields);
  }, [fields]);

  useEffect(() => {
    dimensions$.current.next(dimensions);
  }, [dimensions]);

  useEffect(() => {
    currentPage$.current.next(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const fieldsCurrent = fields$.current;
    const dimensionsCurrent = dimensions$.current;
    const currentPageCurrent = currentPage$.current;
    return () => {
      fieldsCurrent.complete();
      dimensionsCurrent.complete();
      currentPageCurrent.complete();
    };
  }, []);

  return useMemo(
    () => ({
      fields$: fields$.current,
      dimensions$: dimensions$.current,
      currentPage$: currentPage$.current,
    }),
    []
  );
}
