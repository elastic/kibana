/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  CustomFilter,
  ExistsFilter,
  GeoBoundingBoxFilter,
  GeoPolygonFilter,
  MetaFilter,
  PhraseFilter,
  PhrasesFilter,
  QueryFilter,
  RangeFilter,
} from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { CustomFilterView } from './custom_filter_view';
import { ExistsFilterView } from './exists_filter_view';
import { GeoBoundingBoxFilterView } from './geo_bounding_box_filter_view';
import { GeoPolygonFilterView } from './geo_polygon_filter_view';
import { PhraseFilterView } from './phrase_filter_view';
import { PhrasesFilterView } from './phrases_filter_view';
import { QueryFilterView } from './query_filter_view';
import { RangeFilterView } from './range_filter_view';

interface Props {
  filter: MetaFilter;
}

export function FilterView({ filter }: Props) {
  if (filter.meta.alias !== null) {
    return <span>{filter.meta.alias}</span>;
  }
  return (
    <span>
      {filter.meta.negate ? (
        <FormattedMessage id="common.ui.filterBar.negatedFilterPrefix" defaultMessage="NOT " />
      ) : (
        ''
      )}
      {renderViewForType(filter)}
    </span>
  );
}

function renderViewForType(filter: MetaFilter) {
  switch (filter.meta.type) {
    case 'exists':
      return <ExistsFilterView filter={filter as ExistsFilter} />;
    case 'geo_bounding_box':
      return <GeoBoundingBoxFilterView filter={filter as GeoBoundingBoxFilter} />;
    case 'geo_polygon':
      return <GeoPolygonFilterView filter={filter as GeoPolygonFilter} />;
    case 'phrase':
      return <PhraseFilterView filter={filter as PhraseFilter} />;
    case 'phrases':
      return <PhrasesFilterView filter={filter as PhrasesFilter} />;
    case 'query_string':
      return <QueryFilterView filter={filter as QueryFilter} />;
    case 'range':
      return <RangeFilterView filter={filter as RangeFilter} />;
    default:
      return <CustomFilterView filter={filter as CustomFilter} />;
  }
}
