/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';

/**
 * Shared filtering logic for metric fields
 * Filters by dimensions and search term
 */
export const useFilteredFields = ({
  fields,
  dimensions,
  searchTerm,
}: {
  fields: MetricField[];
  dimensions: string[];
  searchTerm: string;
}) => {
  const dimensionsSet = useMemo(() => new Set(dimensions), [dimensions]);
  const searchTermLower = useMemo(() => searchTerm.toLowerCase(), [searchTerm]);

  return useMemo(() => {
    return fields.filter((field) => {
      if (field.noData) {
        return false;
      }

      if (searchTermLower && !field.name.toLowerCase().includes(searchTermLower)) {
        return false;
      }

      if (dimensionsSet.size > 0) {
        const hasMatchingDimension = field.dimensions.some((d) => dimensionsSet.has(d.name));
        if (!hasMatchingDimension) {
          return false;
        }
      }

      return true;
    });
  }, [fields, searchTermLower, dimensionsSet]);
};
