/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { MetricField, Dimension } from '../../../../types';

export const useMetricFieldsFilter = ({
  fields,
  dimensions,
  searchTerm,
}: {
  fields: MetricField[];
  searchTerm: string;
  dimensions: Dimension[];
}) => {
  const filteredFields = useMemo(() => {
    const dimensionFieldNamesSet = new Set(dimensions.map((d) => d.name));
    const searchTermLower = searchTerm?.toLowerCase();

    const hasClientFilters = dimensionFieldNamesSet.size > 0 || searchTermLower?.length > 0;

    if (!hasClientFilters) {
      return fields;
    }

    return fields.filter((field) => {
      if (searchTermLower && !field.name.toLowerCase().includes(searchTermLower)) {
        return false;
      }

      if (dimensionFieldNamesSet.size > 0) {
        return field.dimensions.some((d) => dimensionFieldNamesSet.has(d.name));
      }

      return true;
    });
  }, [fields, searchTerm, dimensions]);

  return { filteredFields };
};
