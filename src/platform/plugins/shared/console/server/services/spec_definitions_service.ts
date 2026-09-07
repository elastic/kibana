/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _, { merge } from 'lodash';
import { globSync } from 'fs';
import { basename, join } from 'path';
import normalizePath from 'normalize-path';
import { readFileSync } from 'fs';

import type {
  EndpointDefinition,
  EndpointDescription,
  EndpointsAvailability,
} from '../../common/types';
import {
  AUTOCOMPLETE_DEFINITIONS_FOLDER,
  GENERATED_SUBFOLDER,
  MANUAL_SUBFOLDER,
  OVERRIDES_SUBFOLDER,
  API_DOCS_LINK,
  AUTOCOMPLETE_ATOMIC_RULE_KEYS,
} from '../../common/constants';
import { jsSpecLoaders } from '../lib';

export interface SpecDefinitionsDependencies {
  endpointsAvailability: EndpointsAvailability;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// A rule is atomic when the compiler does not descend into its plain-object
// fields: arrays, primitives, and objects carrying a meta key above. Atomic
// rules are replaced wholesale so curated constructs stay authoritative and
// generated/override shape mismatches can never produce a grafted hybrid.
const isAtomicRule = (value: unknown): boolean =>
  !isPlainObject(value) || AUTOCOMPLETE_ATOMIC_RULE_KEYS.some((key) => key in value);

// Merge a curated override rule onto its generated counterpart the way the body
// compiler reads them: recurse into plain-object field maps in curated order,
// append generated-only fields, and replace atomic rules wholesale so a curated
// construct (e.g. a whole-body __scope_link) stays authoritative and a
// generated/override shape mismatch can never graft curated keys onto an array.
// A record override always yields a record (its own value or a merged map), so
// the endpoint-body call site stays typed without a cast.
function mergeAutocompleteRules(
  generated: unknown,
  override: Record<string, unknown>
): Record<string, unknown>;
function mergeAutocompleteRules(generated: unknown, override: unknown): unknown;
function mergeAutocompleteRules(generated: unknown, override: unknown): unknown {
  if (isAtomicRule(generated) || isAtomicRule(override)) {
    return override;
  }
  const generatedObject = generated as Record<string, unknown>;
  const overrideObject = override as Record<string, unknown>;
  const entries = Object.entries(overrideObject).map(([key, overrideValue]) => [
    key,
    Object.hasOwn(generatedObject, key)
      ? mergeAutocompleteRules(generatedObject[key], overrideValue)
      : overrideValue,
  ]);
  for (const [key, generatedValue] of Object.entries(generatedObject)) {
    if (!Object.hasOwn(overrideObject, key)) {
      entries.push([key, generatedValue]);
    }
  }
  return Object.fromEntries(entries);
}

export class SpecDefinitionsService {
  private readonly name = 'es';

  private readonly globalRules: Record<string, any> = {};
  private readonly endpoints: Record<string, EndpointDescription> = {};

  private hasLoadedDefinitions = false;

  public addGlobalAutocompleteRules(parentNode: string, rules: unknown) {
    this.globalRules[parentNode] = rules;
  }

  public addEndpointDescription(
    endpoint: string,
    description: EndpointDescription = {},
    isServerless: boolean = false
  ) {
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

    if (isServerless) {
      const serverlessDocUrl =
        typeof description.documentation_serverless === 'string'
          ? description.documentation_serverless.trim()
          : undefined;
      description.documentation = serverlessDocUrl || API_DOCS_LINK;

      if (!serverlessDocUrl) {
        delete description.documentation_serverless;
      }
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
    const generatedFiles = globSync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, GENERATED_SUBFOLDER, '*.json'))
    ).map((p) => normalizePath(p));
    const overrideFiles = globSync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, OVERRIDES_SUBFOLDER, '*.json'))
    ).map((p) => normalizePath(p));
    const manualFiles = globSync(
      normalizePath(join(AUTOCOMPLETE_DEFINITIONS_FOLDER, MANUAL_SUBFOLDER, '*.json'))
    ).map((p) => normalizePath(p));

    // definitions files contain only 1 definition per endpoint name { "endpointName": { endpointDescription }}
    // all endpoints need to be merged into 1 object with endpoint names as keys and endpoint definitions as values
    const jsonDefinitions = {} as Record<string, EndpointDescription>;
    generatedFiles.forEach((file) => {
      const overrideFile = overrideFiles.find((f) => basename(f) === basename(file));
      const loadedDefinition: EndpointDefinition = JSON.parse(readFileSync(file, 'utf8'));
      if (overrideFile) {
        const loadedOverride: EndpointDefinition = JSON.parse(readFileSync(overrideFile, 'utf8'));
        // body rules are merged structurally, matching how the body compiler
        // (public/lib/autocomplete/body_completer.ts) reads the rule tree:
        //   - a plain-object rule is a set of field rules whose non-meta keys
        //     become suggestions, so the override deep-merges into the generated
        //     object and generated-only fields keep surfacing as the spec grows
        //   - a rule the compiler treats as atomic — an array, a primitive, or an
        //     object carrying __scope_link/__one_of/__any_of (whose
        //     sibling keys the compiler ignores) — is replaced wholesale by the
        //     curated value, so shape mismatches can never graft curated keys onto
        //     a generated array and drop them during serialization
        Object.entries(loadedOverride).forEach(([endpointName, endpointDescription]) => {
          const generatedRules = loadedDefinition[endpointName]?.data_autocomplete_rules;
          const overrideRules = endpointDescription.data_autocomplete_rules;
          if (overrideRules && generatedRules) {
            endpointDescription.data_autocomplete_rules = mergeAutocompleteRules(
              generatedRules,
              overrideRules
            );
            delete loadedDefinition[endpointName].data_autocomplete_rules;
          }
        });
        merge(loadedDefinition, loadedOverride);
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
        this.addEndpointDescription(endpoint, description, endpointsAvailability === 'serverless');
      }
    });
  }

  private loadJSDefinitions() {
    jsSpecLoaders.forEach((addJsSpec) => addJsSpec(this));
  }
}
