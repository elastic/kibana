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

import _, { merge } from 'lodash';
import glob from 'glob';
import { basename, join, resolve } from 'path';
import { readFileSync } from 'fs';

import { jsSpecLoaders } from '../lib';

const PATH_TO_OSS_JSON_SPEC = resolve(__dirname, '../lib/spec_definitions/json');

export class SpecDefinitionsService {
  private readonly name = 'es';

  private readonly globalRules: Record<string, any> = {};
  private readonly endpoints: Record<string, any> = {};
  private readonly extensionSpecFilePaths: string[] = [];

  private hasLoadedSpec = false;

  public addGlobalAutocompleteRules(parentNode: string, rules: any) {
    this.globalRules[parentNode] = rules;
  }

  public addEndpointDescription(endpoint: string, description: any = {}) {
    let copiedDescription: any = {};
    if (this.endpoints[endpoint]) {
      copiedDescription = { ...this.endpoints[endpoint] };
    }
    let urlParamsDef: any;
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

  public addProcessorDefinition(processor: any) {
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
    const generatedFiles = glob.sync(join(dirname, 'generated', '*.json'));
    const overrideFiles = glob.sync(join(dirname, 'overrides', '*.json'));

    return generatedFiles.reduce((acc, file) => {
      const overrideFile = overrideFiles.find((f) => basename(f) === basename(file));
      const loadedSpec = JSON.parse(readFileSync(file, 'utf8'));
      if (overrideFile) {
        merge(loadedSpec, JSON.parse(readFileSync(overrideFile, 'utf8')));
      }
      const spec: any = {};
      Object.entries(loadedSpec).forEach(([key, value]) => {
        if (acc[key]) {
          // add time to remove key collision
          spec[`${key}${Date.now()}`] = value;
        } else {
          spec[key] = value;
        }
      });

      return { ...acc, ...spec };
    }, {} as any);
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
