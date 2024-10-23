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

/**
 *
 * @param urlParametrizedComponentFactories a dictionary of factory functions
 * that will be used as fallback for parametrized path part (i.e., {index} )
 * see UrlPatternMatcher
 * @constructor
 * @param bodyParametrizedComponentFactories same as urlParametrizedComponentFactories but used for body compilation
 */
function Api(urlParametrizedComponentFactories, bodyParametrizedComponentFactories) {
  this.globalRules = Object.create(null);
  this.endpoints = Object.create(null);
  this.urlPatternMatcher = new UrlPatternMatcher(urlParametrizedComponentFactories);
  this.globalBodyComponentFactories = bodyParametrizedComponentFactories;
  this.name = '';
}

(function (cls) {
  cls.addGlobalAutocompleteRules = function (parentNode, rules) {
    this.globalRules[parentNode] = compileBodyDescription(
      'GLOBAL.' + parentNode,
      rules,
      this.globalBodyComponentFactories
    );
  };

  cls.getGlobalAutocompleteComponents = function (term, throwOnMissing) {
    const result = this.globalRules[term];
    if (_.isUndefined(result) && (throwOnMissing || _.isUndefined(throwOnMissing))) {
      throw new Error("failed to resolve global components for  ['" + term + "']");
    }
    return result;
  };

  cls.addEndpointDescription = function (endpoint, description) {
    const copiedDescription = {};
    _.assign(copiedDescription, description || {});
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
  };

  cls.getEndpointDescriptionByEndpoint = function (endpoint) {
    return this.endpoints[endpoint];
  };

  cls.getTopLevelUrlCompleteComponents = function (method) {
    return this.urlPatternMatcher.getTopLevelComponents(method);
  };

  cls.getUnmatchedEndpointComponents = function () {
    return globalsOnlyAutocompleteComponents();
  };

  cls.clear = function () {
    this.endpoints = {};
    this.globalRules = {};
  };
})(Api.prototype);

export default Api;
