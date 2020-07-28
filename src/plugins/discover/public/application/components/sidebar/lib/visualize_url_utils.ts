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
import uuid from 'uuid/v4';
import rison from 'rison-node';
import { parse, stringify } from 'query-string';
import {
  IFieldType,
  IIndexPattern,
  IndexPatternField,
  KBN_FIELD_TYPES,
} from '../../../../../../data/public';
import { AppState } from '../../../angular/discover_state';
import { DiscoverServices } from '../../../../build_services';
import { VisualizationsStart, VisTypeAlias } from '../../../../../../visualizations/public';
import { AGGS_TERMS_SIZE_SETTING } from '../../../../../common';

export function isMapsAppRegistered(visualizations: VisualizationsStart) {
  return visualizations.getAliases().some(({ name }: VisTypeAlias) => {
    return name === 'maps';
  });
}

export function isFieldVisualizable(field: IFieldType, visualizations: VisualizationsStart) {
  if (field.name === '_id') {
    // Else you'd get a 'Fielddata access on the _id field is disallowed' error on ES side.
    return false;
  }
  if (
    (field.type === KBN_FIELD_TYPES.GEO_POINT || field.type === KBN_FIELD_TYPES.GEO_SHAPE) &&
    isMapsAppRegistered(visualizations)
  ) {
    return true;
  }
  return field.visualizable;
}

export function getMapsAppUrl(
  field: IFieldType,
  indexPattern: IIndexPattern,
  appState: AppState,
  columns: string[]
) {
  const mapAppParams = new URLSearchParams();

  // Copy global state
  const locationSplit = window.location.hash.split('?');
  if (locationSplit.length > 1) {
    const discoverParams = new URLSearchParams(locationSplit[1]);
    const globalStateUrlValue = discoverParams.get('_g');
    if (globalStateUrlValue) {
      mapAppParams.set('_g', globalStateUrlValue);
    }
  }

  // Copy filters and query in app state
  const mapsAppState: any = {
    filters: appState.filters || [],
  };
  if (appState.query) {
    mapsAppState.query = appState.query;
  }
  // @ts-ignore
  mapAppParams.set('_a', rison.encode(mapsAppState));

  // create initial layer descriptor
  const hasColumns = columns && columns.length && columns[0] !== '_source';
  const supportsClustering = field.aggregatable;
  mapAppParams.set(
    'initialLayers',
    // @ts-ignore
    rison.encode_array([
      {
        id: uuid(),
        label: indexPattern.title,
        sourceDescriptor: {
          id: uuid(),
          type: 'ES_SEARCH',
          geoField: field.name,
          tooltipProperties: hasColumns ? columns : [],
          indexPatternId: indexPattern.id,
          scalingType: supportsClustering ? 'CLUSTERS' : 'LIMIT',
        },
        visible: true,
        type: supportsClustering ? 'BLENDED_VECTOR' : 'VECTOR',
      },
    ])
  );

  return {
    app: 'maps',
    path: `/map#?${mapAppParams.toString()}`,
  };
}

export function getVisualizeUrl(
  field: IndexPatternField,
  indexPattern: IIndexPattern,
  state: AppState,
  columns: string[],
  services: DiscoverServices
) {
  const aggsTermSize = services.uiSettings.get(AGGS_TERMS_SIZE_SETTING);
  const urlParams = parse(services.history().location.search) as Record<string, string>;

  if (
    (field.type === KBN_FIELD_TYPES.GEO_POINT || field.type === KBN_FIELD_TYPES.GEO_SHAPE) &&
    isMapsAppRegistered(services.visualizations)
  ) {
    return getMapsAppUrl(field, indexPattern, state, columns);
  }

  let agg;
  const isGeoPoint = field.type === KBN_FIELD_TYPES.GEO_POINT;
  const type = isGeoPoint ? 'tile_map' : 'histogram';
  // If we're visualizing a date field, and our index is time based (and thus has a time filter),
  // then run a date histogram
  if (field.type === 'date' && indexPattern.timeFieldName === field.name) {
    agg = {
      type: 'date_histogram',
      schema: 'segment',
      params: {
        field: field.name,
        interval: 'auto',
      },
    };
  } else if (isGeoPoint) {
    agg = {
      type: 'geohash_grid',
      schema: 'segment',
      params: {
        field: field.name,
        precision: 3,
      },
    };
  } else {
    agg = {
      type: 'terms',
      schema: 'segment',
      params: {
        field: field.name,
        size: parseInt(aggsTermSize, 10),
        orderBy: '2',
      },
    };
  }
  const linkUrlParams = {
    ...urlParams,
    ...{
      indexPattern: state.index!,
      type,
      _a: rison.encode({
        filters: state.filters || [],
        query: state.query,
        vis: {
          type,
          aggs: [{ schema: 'metric', type: 'count', id: '2' }, agg],
        },
      } as any),
    },
  };

  return {
    app: 'visualize',
    path: `#/create?${stringify(linkUrlParams)}`,
  };
}
