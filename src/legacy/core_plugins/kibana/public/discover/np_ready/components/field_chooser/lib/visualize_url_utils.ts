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
import {
  IFieldType,
  IIndexPattern,
  KBN_FIELD_TYPES,
} from '../../../../../../../../../plugins/data/public';
import { AppState } from '../../../angular/discover_state';
import { getServices } from '../../../../kibana_services';

import { Field } from '../types';

function getMapsAppBaseUrl() {
  const mapsAppVisAlias = getServices()
    .visualizations.getAliases()
    .find(({ name }) => {
      return name === 'maps';
    });
  return mapsAppVisAlias ? mapsAppVisAlias.aliasUrl : null;
}

export function isMapsAppRegistered() {
  return getServices()
    .visualizations.getAliases()
    .some(({ name }) => {
      return name === 'maps';
    });
}

export function isFieldVisualizable(field: IFieldType) {
  if (
    (field.type === KBN_FIELD_TYPES.GEO_POINT || field.type === KBN_FIELD_TYPES.GEO_SHAPE) &&
    isMapsAppRegistered()
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
  const locationSplit = window.location.href.split('discover?');
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
        },
        visible: true,
        type: 'VECTOR',
      },
    ])
  );

  return getServices().addBasePath(`${getMapsAppBaseUrl()}?${mapAppParams.toString()}`);
}

export function getVisualizeUrl(
  field: Field,
  indexPattern: IIndexPattern,
  state: AppState,
  columns: string[],
  aggsTermSize: string,
  urlParams: Record<string, string>
) {
  if (!state) {
    return '';
  }

  if (
    (field.type === KBN_FIELD_TYPES.GEO_POINT || field.type === KBN_FIELD_TYPES.GEO_SHAPE) &&
    isMapsAppRegistered()
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
        query: state.query || undefined,
        vis: {
          type,
          aggs: [{ schema: 'metric', type: 'count', id: '2' }, agg],
        },
      } as any),
    },
  };
  const mapAppParams = new URLSearchParams(linkUrlParams);

  return '#/visualize/create?' + mapAppParams.toString();
}
