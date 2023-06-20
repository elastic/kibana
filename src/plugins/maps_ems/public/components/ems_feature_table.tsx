/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiInMemoryTable, Search } from '@elastic/eui';
import { Feature, FeatureCollection } from 'geojson';
import React, { useState } from 'react';

interface Field {
  type: string;
  name: string;
  description: string;
}

type EMSFormatTypeStrings = 'geojson' | 'topojson';

interface FeatureTableProps {
  jsonFeatures?: FeatureCollection;
  onShow: (feature: Feature) => void;
  onFilterChange: (features: Feature[]) => void;
  getFieldsInLanguage: () => Field[];
  getFormatOfTypeUrl: (type: EMSFormatTypeStrings) => string;
}

export function EmsFeatureTable({
  jsonFeatures,
  onShow,
  onFilterChange,
  getFieldsInLanguage,
  getFormatOfTypeUrl,
}: FeatureTableProps) {
  const [currentFilter, setCurrentFilter] = useState('');

  const filteredFeatures = () => {
    if (!jsonFeatures) return [];
    const filterNormalized = currentFilter.toLowerCase();
    const passes = [];
    const fields = getFieldsInLanguage();
    for (let i = 0; i < jsonFeatures.features.length; i++) {
      const feature = jsonFeatures.features[i];
      for (let j = 0; j < fields.length; j++) {
        const field = fields[j];
        const fieldValue = feature.properties![field.name];
        const stringifiedFieldValue = JSON.stringify(fieldValue);
        if (!stringifiedFieldValue) {
          continue;
        }
        const fieldValueNormalized = stringifiedFieldValue.toLowerCase();
        if (fieldValueNormalized.indexOf(filterNormalized) > -1) {
          passes.push(feature);
          break;
        }
      }
    }
    return passes;
  };

  const rows = filteredFeatures().map((feature) => feature.properties);

  const columns = getFieldsInLanguage().map((field) => ({
    field: field.name,
    name: `${field.description} (${field.name})`,
    sortable: true,
  }));

  const search: Search = {
    toolsRight: (
      <EuiButton href={getFormatOfTypeUrl('geojson')} target="_blank" type="application/geo+json">
        Download as GeoJSON
      </EuiButton>
    ),
    box: {
      incremental: true,
    },
    onChange: ({ queryText }) => setCurrentFilter(queryText),
  };

  const rowProps = (row) => {
    return {
      onClick: () => {
        const feature = jsonFeatures!.features[row.__id__];
        onShow(feature);
      },
    };
  };

  return (
    <EuiInMemoryTable
      rowProps={rowProps}
      items={rows}
      columns={columns}
      search={search}
      pagination={true}
      sorting
    />
  );
}
