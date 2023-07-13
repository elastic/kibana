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

import {
  AUTOCOMPLETE_DEFINITIONS_FOLDER,
  ENDPOINTS_SUBFOLDER,
  GLOBALS_SUBFOLDER,
  OVERRIDES_SUBFOLDER,
} from '../../common/constants';
import { jsSpecLoaders } from '../lib';
import type { EndpointDefinition, GlobalDefinition } from '../../common/types';

export class SpecDefinitionsService {
  private readonly name = 'es';

  private readonly globalRules: Record<string, any> = {};
  private readonly endpoints: Record<string, any> = {};

  private hasLoadedSpec = false;

  public addGlobalAutocompleteRules(parentNode: string, rules: unknown) {
    this.globalRules[parentNode] = rules;
  }

  public addEndpointDescription(endpoint: string, description: EndpointDefinition = {}) {
    let copiedDescription: { patterns?: string; url_params?: Record<string, unknown> } = {};
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
      if (p.indexOf('{indices}') >= 0) {
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

  public start() {
    if (!this.hasLoadedSpec) {
      this.loadJsonSpec();
      this.loadJSSpec();
      this.hasLoadedSpec = true;
    } else {
      throw new Error('Service has already started!');
    }
  }

  private loadEndpoints() {
    // we need to normalize paths otherwise they don't work on windows, see https://github.com/elastic/kibana/issues/151032
    const generatedFiles = globby.sync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, ENDPOINTS_SUBFOLDER, '*.json'))
    );
    const overrideFiles = globby.sync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, OVERRIDES_SUBFOLDER, '*.json'))
    );

    return generatedFiles.reduce((acc, file) => {
      const overrideFile = overrideFiles.find((f) => basename(f) === basename(file));
      const loadedSpec: Record<string, EndpointDefinition> = JSON.parse(readFileSync(file, 'utf8'));
      if (overrideFile) {
        merge(loadedSpec, JSON.parse(readFileSync(overrideFile, 'utf8')));
      }
      Object.entries(loadedSpec).forEach(([key, value]) => {
        if (acc[key]) {
          // add time to remove key collision
          acc[`${key}${Date.now()}`] = value;
        } else {
          acc[key] = value;
        }
      });
      return acc;
    }, {} as Record<string, EndpointDefinition>);
  }

  private loadGlobals() {
    const globalsFiles = globby.sync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, GLOBALS_SUBFOLDER, '*.json'))
    );
    globalsFiles.forEach((globalFile) => {
      const loadedGlobalDefinition: GlobalDefinition = JSON.parse(readFileSync(globalFile, 'utf8'));
      const { name, params } = loadedGlobalDefinition;
      this.addGlobalAutocompleteRules(name, params);
    });
  }

  private loadJsonSpec() {
    const endpointsSpecs = this.loadEndpoints();

    Object.keys(endpointsSpecs).forEach((endpoint) => {
      this.addEndpointDescription(endpoint, endpointsSpecs[endpoint]);
    });

    this.loadGlobals();
  }

  private loadJSSpec() {
    jsSpecLoaders.forEach((addJsSpec) => addJsSpec(this));
  }
}
