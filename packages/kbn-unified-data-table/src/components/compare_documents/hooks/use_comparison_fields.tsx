/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { useMemo } from 'react';

export interface UseComparisonFieldsProps {
  dataView: DataView;
  selectedFieldNames: string[];
  showAllFields: boolean;
}

export const useComparisonFields = ({
  dataView,
  selectedFieldNames,
  showAllFields,
}: UseComparisonFieldsProps) => {
  const comparisonFields = useMemo(() => {
    let fields: string[] = [];

    if (showAllFields) {
      if (dataView.timeFieldName) {
        fields.push(dataView.timeFieldName);
      }

      dataView.fields
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .forEach((field) => {
          if (field.name !== dataView.timeFieldName) {
            fields.push(field.name);
          }
        });
    } else {
      fields = selectedFieldNames;
    }

    return fields;
  }, [selectedFieldNames, dataView.fields, dataView.timeFieldName, showAllFields]);

  return comparisonFields;
};
