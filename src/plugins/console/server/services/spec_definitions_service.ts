/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { merge } from 'lodash';
import globby from 'globby';
import { basename, join } from 'path';
import normalizePath from 'normalize-path';
import { readFileSync } from 'fs';

import { EndpointDefinition, EndpointDescription, EndpointsAvailability } from '../../common/types';
import {
  AUTOCOMPLETE_DEFINITIONS_FOLDER,
  GENERATED_SUBFOLDER,
  MANUAL_SUBFOLDER,
  OVERRIDES_SUBFOLDER,
} from '../../common/constants';
import { jsSpecLoaders } from '../lib';

export interface SpecDefinitionsDependencies {
  endpointsAvailability: EndpointsAvailability;
}

export class SpecDefinitionsService {
  private readonly name = 'es';

  private readonly globalRules: Record<string, any> = {};
  private readonly endpoints: Record<string, EndpointDescription> = {};

  private hasLoadedDefinitions = false;

  public addGlobalAutocompleteRules(parentNode: string, rules: unknown) {
    this.globalRules[parentNode] = rules;
  }

  public addEndpointDescription(endpoint: string, description: EndpointDescription = {}) {
    let copiedDescription: EndpointDescription = {};
    if (this.endpoints[endpoint]) {
      copiedDescription = { ...this.endpoints[endpoint] };
    }
    let urlParamsDef:
      | {
          ignore_unavailable?: string;
          allow_no_indices?: string;
          expand_wildcards?: string[];
        }
      | undefined;

    _.each(description.patterns || [], function (p) {
      if (p.indexOf('{index}') >= 0) {
        urlParamsDef = urlParamsDef || {};
        urlParamsDef.ignore_unavailable = '__flag__';
        urlParamsDef.allow_no_indices = '__flag__';
        urlParamsDef.expand_wildcards = ['open', 'closed'];
      }
    });

    if (urlParamsDef) {
      description.url_params = _.assign(description.url_params || {}, copiedDescription.url_params);
      _.defaults(description.url_params, urlParamsDef);
    }

    _.assign(copiedDescription, description);
    _.defaults(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET'],
    });

    this.endpoints[endpoint] = copiedDescription;
  }

  public asJson() {
    return {
      name: this.name,
      globals: this.globalRules,
      endpoints: this.endpoints,
    };
  }

  public start({ endpointsAvailability }: SpecDefinitionsDependencies) {
    if (!this.hasLoadedDefinitions) {
      this.loadJsonDefinitions(endpointsAvailability);
      this.loadJSDefinitions();
      this.hasLoadedDefinitions = true;
    } else {
      throw new Error('Service has already started!');
    }
  }

  private loadJSONDefinitionsFiles() {
    // we need to normalize paths otherwise they don't work on windows, see https://github.com/elastic/kibana/issues/151032
    const generatedFiles = globby.sync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, GENERATED_SUBFOLDER, '*.json'))
    );
    const overrideFiles = globby.sync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, OVERRIDES_SUBFOLDER, '*.json'))
    );
    const manualFiles = globby.sync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, MANUAL_SUBFOLDER, '*.json'))
    );

    // definitions files contain only 1 definition per endpoint name { "endpointName": { endpointDescription }}
    // all endpoints need to be merged into 1 object with endpoint names as keys and endpoint definitions as values
    const jsonDefinitions = {} as Record<string, EndpointDescription>;
    generatedFiles.forEach((file) => {
      const overrideFile = overrideFiles.find((f) => basename(f) === basename(file));
      const loadedDefinition: EndpointDefinition = JSON.parse(readFileSync(file, 'utf8'));
      if (overrideFile) {
        merge(loadedDefinition, JSON.parse(readFileSync(overrideFile, 'utf8')));
      }
      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });

    // add manual definitions
    manualFiles.forEach((file) => {
      const loadedDefinition: EndpointDefinition = JSON.parse(readFileSync(file, 'utf8'));
      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });
    return jsonDefinitions;
  }

  private addToJsonDefinitions({
    loadedDefinition,
    jsonDefinitions,
  }: {
    loadedDefinition: EndpointDefinition;
    jsonDefinitions: Record<string, EndpointDescription>;
  }) {
    // iterate over EndpointDefinition for a safe and easy access to the only property in this object
    Object.entries(loadedDefinition).forEach(([endpointName, endpointDescription]) => {
      // endpoints should all have unique names, but in case that happens unintentionally
      // don't silently overwrite the definition but create a new unique endpoint name
      if (jsonDefinitions[endpointName]) {
        // add time to create a unique key
        jsonDefinitions[`${endpointName}${Date.now()}`] = endpointDescription;
      } else {
        jsonDefinitions[endpointName] = endpointDescription;
      }
    });
    return jsonDefinitions;
  }

  private loadJsonDefinitions(endpointsAvailability: string) {
    const result = this.loadJSONDefinitionsFiles();

    Object.keys(result).forEach((endpoint) => {
      const description = result[endpoint];
      const addEndpoint =
        // If the 'availability' property doesn't exist, display the endpoint by default
        !description.availability ||
        (endpointsAvailability === 'stack' && description.availability.stack) ||
        (endpointsAvailability === 'serverless' && description.availability.serverless);
      if (addEndpoint) {
        this.addEndpointDescription(endpoint, description);
      }
    });
  }

  private loadJSDefinitions() {
    jsSpecLoaders.forEach((addJsSpec) => addJsSpec(this));
  }
}
