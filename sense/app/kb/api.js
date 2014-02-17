define([ '_', 'exports', 'autocomplete/url_pattern_matcher', 'autocomplete/url_params'],
  function (_, exports, url_pattern_matcher, url_params) {
    'use strict';

    /**
     *
     * @param name
     * @param globalSharedComponentFactories a dictionary of factory functions
     * that will be used as fallback for parametrized path part (i.e., {indices} )
     * see url_pattern_matcher.UrlPatternMatcher
     * @constructor
     */
    function Api(name, globalSharedComponentFactories) {
      this.globalRules = {};
      this.endpoints = {};
      this.name = name;
      this.urlPatternMatcher = new url_pattern_matcher.UrlPatternMatcher(globalSharedComponentFactories);
    }

    Api.prototype.addGlobalAutocompleteRules = function (parentNode, rules) {
      this.globalRules[parentNode] = rules;
    };

    Api.prototype.getGlobalAutocompleteRules = function () {
      return this.globalRules;
    };

    Api.prototype.addEndpointDescription = function (endpoint, description) {

      var copiedDescription = {};
      _.extend(copiedDescription, description || {});
      _.defaults(copiedDescription, {
        id: endpoint,
        patterns: [endpoint],
        methods: [ 'GET' ]
      });
      _.each(copiedDescription.patterns, function (p) {
        this.urlPatternMatcher.addEndpoint(p, copiedDescription);
      }, this);

      copiedDescription.paramsAutocomplete = new url_params.UrlParams(copiedDescription.url_params);

      this.endpoints[endpoint] = copiedDescription;
    };

    Api.prototype.getEndpointDescriptionByEndpoint = function (endpoint) {
      return this.endpoints[endpoint];
    };


    Api.prototype.getTopLevelUrlCompleteComponents = function () {
      return this.urlPatternMatcher.getTopLevelComponents();
    };

    Api.prototype.clear = function () {
      this.endpoints = {};
      this.globalRules = {};
    };

    exports.Api = Api;
    return exports;
  }
);