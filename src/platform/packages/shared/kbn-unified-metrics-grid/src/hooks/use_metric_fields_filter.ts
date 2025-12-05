/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useEffect, useState } from 'react';
import type { MetricField, Dimension } from '../types';
import { parseDimensionFilters, buildFieldSpecsKey } from '../common/utils';
import type { SpecsKey } from '../common/utils';

export const useMetricFieldsFilter = ({
  fields,
  isFieldsLoading,
  dimensions,
  searchTerm,
  dimensionValues,
  dimensionMetricFields,
}: {
  fields: MetricField[];
  isFieldsLoading: boolean;
  searchTerm: string;
  dimensions: Dimension[];
  dimensionValues: string[];
  dimensionMetricFields: SpecsKey[];
}) => {
  const parsedDimensionFilters = useMemo(
    () => parseDimensionFilters(dimensionValues),
    [dimensionValues]
  );
  const [filteredFields, setFilteredFields] = useState<MetricField[]>(fields);

  // Client-side filtering by dimensions and search term
  const dimensionFieldNamesSet = useMemo(
    () => new Set(dimensions.map((d) => d.name)),
    [dimensions]
  );
  const dimensionMetricFieldsSet = useMemo(
    () => new Set(dimensionMetricFields),
    [dimensionMetricFields]
  );
  const searchTermLower = useMemo(() => searchTerm?.toLowerCase(), [searchTerm]);

  useEffect(() => {
    if (isFieldsLoading) {
      return;
    }

    const hasClientFilters = dimensionFieldNamesSet.size > 0 || searchTermLower?.length > 0;

    if (!hasClientFilters) {
      setFilteredFields(fields);
      return;
    }

    setFilteredFields(
      fields.filter((field) => {
        if (searchTermLower && !field.name.toLowerCase().includes(searchTermLower)) {
          return false;
        }

        if (dimensionMetricFieldsSet.size > 0) {
          return dimensionMetricFieldsSet.has(buildFieldSpecsKey(field.index, field.name));
        } else if (dimensionFieldNamesSet.size > 0) {
          return field.dimensions.some((d) => dimensionFieldNamesSet.has(d.name));
        }

        return true;
      })
    );
  }, [isFieldsLoading, fields, searchTermLower, dimensionFieldNamesSet, dimensionMetricFieldsSet]);

  return { filteredFields, dimensionFilters: parsedDimensionFilters };
};
