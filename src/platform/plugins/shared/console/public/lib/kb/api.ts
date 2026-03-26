/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { UrlPatternMatcher } from '../autocomplete/components';
import { UrlParams } from '../autocomplete/url_params';
import {
  globalsOnlyAutocompleteComponents,
  compileBodyDescription,
} from '../autocomplete/body_completer';
import type { AutocompleteComponent } from '../autocomplete/components/autocomplete_component';

type UrlFactories = ConstructorParameters<typeof UrlPatternMatcher>[0];
type BodyFactories = Parameters<typeof compileBodyDescription>[2];
type UrlParamsDescription = ConstructorParameters<typeof UrlParams>[0];

type EndpointDescription = Record<string, unknown> & {
  id: string;
  patterns: string[];
  methods: string[];
  url_params?: UrlParamsDescription;
  data_autocomplete_rules?: unknown;
  template?: string;
  paramsAutocomplete?: UrlParams;
  bodyAutocompleteRootComponents?: AutocompleteComponent[];
};

const emptyUrlFactories: UrlFactories = { getComponent: () => undefined };
const emptyBodyFactories: BodyFactories = { getComponent: () => undefined };

/**
 * Standalone API container for Console autocomplete.
 *
 * This intentionally preserves the behavior of the previous JS constructor/prototype pattern.
 */
export class Api {
  public name = '';

  private globalRules: Record<string, AutocompleteComponent[] | undefined> = Object.create(null);
  private endpoints: Record<string, EndpointDescription> = Object.create(null);

  private urlPatternMatcher: UrlPatternMatcher;
  private globalBodyComponentFactories: BodyFactories;

  constructor(
    urlParametrizedComponentFactories: UrlFactories = emptyUrlFactories,
    bodyParametrizedComponentFactories: BodyFactories = emptyBodyFactories
  ) {
    this.urlPatternMatcher = new UrlPatternMatcher(urlParametrizedComponentFactories);
    this.globalBodyComponentFactories = bodyParametrizedComponentFactories;
  }

  public addGlobalAutocompleteRules(parentNode: string, rules: unknown) {
    this.globalRules[parentNode] = compileBodyDescription(
      'GLOBAL.' + parentNode,
      rules,
      this.globalBodyComponentFactories
    );
  }

  public getGlobalAutocompleteComponents(term: string, throwOnMissing?: boolean) {
    const result = this.globalRules[term];
    if (_.isUndefined(result) && (throwOnMissing || _.isUndefined(throwOnMissing))) {
      throw new Error("failed to resolve global components for  ['" + term + "']");
    }
    return result;
  }

  public addEndpointDescription(endpoint: string, description: unknown) {
    const copiedDescription: EndpointDescription = {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET'],
    };

    if (description && typeof description === 'object') {
      _.assign(copiedDescription, description);
    }

    _.defaults(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET'],
    });

    _.each(copiedDescription.patterns, (p) => {
      this.urlPatternMatcher.addEndpoint(p, copiedDescription);
    });

    copiedDescription.paramsAutocomplete = new UrlParams(copiedDescription.url_params);
    copiedDescription.bodyAutocompleteRootComponents = compileBodyDescription(
      copiedDescription.id,
      copiedDescription.data_autocomplete_rules,
      this.globalBodyComponentFactories
    );

    this.endpoints[endpoint] = copiedDescription;
  }

  public getEndpointDescriptionByEndpoint(endpoint: string) {
    return this.endpoints[endpoint];
  }

  public getTopLevelUrlCompleteComponents(method: string) {
    return this.urlPatternMatcher.getTopLevelComponents(method);
  }

  public getUnmatchedEndpointComponents() {
    return globalsOnlyAutocompleteComponents();
  }

  public clear() {
    this.endpoints = {};
    this.globalRules = {};
  }
}
