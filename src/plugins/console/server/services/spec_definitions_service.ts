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

import { AUTOCOMPLETE_DEFINITIONS_FOLDER } from '../../common/constants';
import { jsSpecLoaders } from '../lib';

interface EndpointDescription {
  methods?: string[];
  patterns?: string | string[];
  url_params?: Record<string, unknown>;
  data_autocomplete_rules?: Record<string, unknown>;
  url_components?: Record<string, unknown>;
  priority?: number;
  availability?: Record<string, boolean>;
}

export interface SpecDefinitionsDependencies {
  endpointsAvailability: string;
}

export class SpecDefinitionsService {
  private readonly name = 'es';

  private readonly globalRules: Record<string, any> = {};
  private readonly endpoints: Record<string, any> = {};

  private hasLoadedSpec = false;

  public addGlobalAutocompleteRules(parentNode: string, rules: unknown) {
    this.globalRules[parentNode] = rules;
  }

  public addEndpointDescription(endpoint: string, description: EndpointDescription = {}) {
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

  public start({ endpointsAvailability }: SpecDefinitionsDependencies) {
    if (!this.hasLoadedSpec) {
      this.loadJsonSpec(endpointsAvailability);
      this.loadJSSpec();
      this.hasLoadedSpec = true;
    } else {
      throw new Error('Service has already started!');
    }
  }

  private loadJSONSpecInDir(dirname: string) {
    // we need to normalize paths otherwise they don't work on windows, see https://github.com/elastic/kibana/issues/151032
    const generatedFiles = globby.sync(normalizePath(join(dirname, 'generated', '*.json')));
    const overrideFiles = globby.sync(normalizePath(join(dirname, 'overrides', '*.json')));

    return generatedFiles.reduce((acc, file) => {
      const overrideFile = overrideFiles.find((f) => basename(f) === basename(file));
      const loadedSpec: Record<string, EndpointDescription> = JSON.parse(
        readFileSync(file, 'utf8')
      );
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
    }, {} as Record<string, EndpointDescription>);
  }

  private loadJsonSpec(endpointsAvailability: string) {
    const result = this.loadJSONSpecInDir(AUTOCOMPLETE_DEFINITIONS_FOLDER);

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

  private loadJSSpec() {
    jsSpecLoaders.forEach((addJsSpec) => addJsSpec(this));
  }
}
