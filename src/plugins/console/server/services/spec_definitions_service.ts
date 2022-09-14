/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { merge } from 'lodash';
import globby from 'globby';
import { basename, join, resolve } from 'path';
import { readFileSync } from 'fs';

import { jsSpecLoaders } from '../lib';

const PATH_TO_OSS_JSON_SPEC = resolve(__dirname, '../lib/spec_definitions/json');

interface EndpointDescription {
  methods?: string[];
  patterns?: string | string[];
  url_params?: Record<string, unknown>;
  data_autocomplete_rules?: Record<string, unknown>;
  url_components?: Record<string, unknown>;
  priority?: number;
}

export class SpecDefinitionsService {
  private readonly name = 'es';

  private readonly globalRules: Record<string, any> = {};
  private readonly endpoints: Record<string, any> = {};
  private readonly extensionSpecFilePaths: string[] = [];

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

  public addExtensionSpecFilePath(path: string) {
    this.extensionSpecFilePaths.push(path);
  }

  public addProcessorDefinition(processor: unknown) {
    if (!this.hasLoadedSpec) {
      throw new Error(
        'Cannot add a processor definition because spec definitions have not loaded!'
      );
    }
    this.endpoints._processor!.data_autocomplete_rules.__one_of.push(processor);
  }

  public setup() {
    return {
      addExtensionSpecFilePath: this.addExtensionSpecFilePath.bind(this),
    };
  }

  public start() {
    if (!this.hasLoadedSpec) {
      this.loadJsonSpec();
      this.loadJSSpec();
      this.hasLoadedSpec = true;
      return {
        addProcessorDefinition: this.addProcessorDefinition.bind(this),
      };
    } else {
      throw new Error('Service has already started!');
    }
  }

  private loadJSONSpecInDir(dirname: string) {
    const generatedFiles = globby.sync(join(dirname, 'generated', '*.json'));
    const overrideFiles = globby.sync(join(dirname, 'overrides', '*.json'));

    return generatedFiles.reduce((acc, file) => {
      const overrideFile = overrideFiles.find((f) => basename(f) === basename(file));
      const loadedSpec: Record<string, EndpointDescription> = JSON.parse(
        readFileSync(file, 'utf8')
      );
      if (overrideFile) {
        merge(loadedSpec, JSON.parse(readFileSync(overrideFile, 'utf8')));
      }
      const spec: Record<string, EndpointDescription> = {};
      Object.entries(loadedSpec).forEach(([key, value]) => {
        if (acc[key]) {
          // add time to remove key collision
          spec[`${key}${Date.now()}`] = value;
        } else {
          spec[key] = value;
        }
      });

      return { ...acc, ...spec };
    }, {} as Record<string, EndpointDescription>);
  }

  private loadJsonSpec() {
    const result = this.loadJSONSpecInDir(PATH_TO_OSS_JSON_SPEC);
    this.extensionSpecFilePaths.forEach((extensionSpecFilePath) => {
      merge(result, this.loadJSONSpecInDir(extensionSpecFilePath));
    });

    Object.keys(result).forEach((endpoint) => {
      this.addEndpointDescription(endpoint, result[endpoint]);
    });
  }

  private loadJSSpec() {
    jsSpecLoaders.forEach((addJsSpec) => addJsSpec(this));
  }
}
