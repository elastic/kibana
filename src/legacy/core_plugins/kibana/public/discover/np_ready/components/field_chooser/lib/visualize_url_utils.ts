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
// @ts-ignore
import rison from 'rison-node';
import {
  IFieldType,
  IIndexPattern,
  KBN_FIELD_TYPES,
} from '../../../../../../../../../plugins/data/public';
import { AppState } from '../../../angular/context_state';
import { getServices } from '../../../../kibana_services';

function getMapsAppBaseUrl() {
  const mapsAppVisAlias = getServices()
    .visualizations.types.getAliases()
    .find(({ name }) => {
      return name === 'maps';
    });
  return mapsAppVisAlias ? mapsAppVisAlias.aliasUrl : null;
}

export function isMapsAppRegistered() {
  return getServices()
    .visualizations.types.getAliases()
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
