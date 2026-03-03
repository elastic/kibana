/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { API_BASE_PATH } from '../../../common/constants';

import {
  IndexAutocompleteComponent,
  FieldAutocompleteComponent,
  LegacyTemplateAutocompleteComponent,
  IndexTemplateAutocompleteComponent,
  ComponentTemplateAutocompleteComponent,
  DataStreamAutocompleteComponent,
} from '../autocomplete/components';

import type { SharedComponent } from '../autocomplete/components/shared_component';

import { Api } from './api';
import { isRecord } from '../../../common/utils/record_utils';

let ACTIVE_API = new Api();
let apiLoaded = false;

type ParamComponentFactory = (name: string, parent?: SharedComponent) => SharedComponent;

const componentFactories: Partial<Record<string, ParamComponentFactory>> = {
  index(name, parent) {
    return new IndexAutocompleteComponent(name, parent, true);
  },
  fields(name, parent) {
    return new FieldAutocompleteComponent(name, parent, true);
  },
  field(name, parent) {
    return new FieldAutocompleteComponent(name, parent, false);
  },
  // index templates (non-composable)
  template(name, parent) {
    return new LegacyTemplateAutocompleteComponent(name, parent);
  },
  // composable index templates
  // currently seems to be unused, but that is a useful functionality
  index_template(name, parent) {
    return new IndexTemplateAutocompleteComponent(name, parent);
  },
  // currently seems to be unused, but that is a useful functionality
  component_template(name, parent) {
    return new ComponentTemplateAutocompleteComponent(name, parent);
  },
  // currently seems to be unused, but that is a useful functionality
  data_stream(name, parent) {
    return new DataStreamAutocompleteComponent(name, parent);
  },
};

const parametrizedComponentFactories = {
  getComponent(name: string, _parent?: unknown, _provideDefault?: unknown) {
    return componentFactories[name];
  },
  ...componentFactories,
};

export function getUnmatchedEndpointComponents() {
  return ACTIVE_API.getUnmatchedEndpointComponents();
}

export function getEndpointDescriptionByEndpoint(endpoint: string) {
  return ACTIVE_API.getEndpointDescriptionByEndpoint(endpoint);
}

export function getEndpointBodyCompleteComponents(endpoint: string) {
  const desc = getEndpointDescriptionByEndpoint(endpoint);
  if (!desc) {
    throw new Error("failed to resolve endpoint ['" + endpoint + "']");
  }
  return desc.bodyAutocompleteRootComponents;
}

export function getTopLevelUrlCompleteComponents(method: string) {
  return ACTIVE_API.getTopLevelUrlCompleteComponents(method);
}

export function getGlobalAutocompleteComponents(term: string, throwOnMissing?: boolean) {
  return ACTIVE_API.getGlobalAutocompleteComponents(term, throwOnMissing);
}

function loadApisFromJson(
  json: unknown,
  urlParametrizedComponentFactories?: ConstructorParameters<typeof Api>[0] &
    ConstructorParameters<typeof Api>[1],
  bodyParametrizedComponentFactories?: ConstructorParameters<typeof Api>[0] &
    ConstructorParameters<typeof Api>[1]
) {
  try {
    urlParametrizedComponentFactories =
      urlParametrizedComponentFactories || parametrizedComponentFactories;
    bodyParametrizedComponentFactories =
      bodyParametrizedComponentFactories || urlParametrizedComponentFactories;
    const api = new Api(urlParametrizedComponentFactories, bodyParametrizedComponentFactories);
    const names: string[] = [];
    if (!isRecord(json)) {
      return;
    }

    for (const [name, apiJson] of Object.entries(json)) {
      names.unshift(name);
      if (!isRecord(apiJson)) {
        continue;
      }

      const globals = apiJson.globals;
      if (isRecord(globals)) {
        for (const [globalName, globalJson] of Object.entries(globals)) {
          api.addGlobalAutocompleteRules(globalName, globalJson);
        }
      }

      const endpoints = apiJson.endpoints;
      if (isRecord(endpoints)) {
        for (const [endpointName, endpointJson] of Object.entries(endpoints)) {
          api.addEndpointDescription(endpointName, endpointJson);
        }
      }
    }
    api.name = names.join(',');
    return api;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

function setActiveApi(api: Api | undefined) {
  if (!api) {
    return;
  }

  ACTIVE_API = api;
}

export async function loadActiveApi(http: HttpSetup) {
  // Only load the API data once
  if (apiLoaded) return;
  apiLoaded = true;

  try {
    const data: unknown = await http.get(`${API_BASE_PATH}/api_server`);
    setActiveApi(loadApisFromJson(data));
  } catch (err) {
    const responseText =
      isRecord(err) && typeof err.responseText === 'string' ? err.responseText : String(err);
    // eslint-disable-next-line no-console
    console.log(`failed to load API: ${responseText}`);
    // If we fail to load the API, clear this flag so it can be retried
    apiLoaded = false;
  }
}

export const _test = {
  loadApisFromJson,
  setActiveApi,
};
