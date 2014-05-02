define([ '_', 'exports', 'autocomplete/url_pattern_matcher', 'autocomplete/url_params', 'autocomplete/body_completer'],
  function (_, exports, url_pattern_matcher, url_params, body_completer) {
    'use strict';

    /**
     *
     * @param name
     * @param urlParametrizedComponentFactories a dictionary of factory functions
     * that will be used as fallback for parametrized path part (i.e., {indices} )
     * see url_pattern_matcher.UrlPatternMatcher
     * @constructor
     * @param bodyParametrizedComponentFactories same as urlParametrizedComponentFactories but used for body compilation
     */
    function Api(name, urlParametrizedComponentFactories, bodyParametrizedComponentFactories) {
      this.globalRules = {};
      this.endpoints = {};
      this.name = name;
      this.urlPatternMatcher = new url_pattern_matcher.UrlPatternMatcher(urlParametrizedComponentFactories);
      this.globalBodyComponentFactories = bodyParametrizedComponentFactories;
    }

    (function (cls) {
      cls.addGlobalAutocompleteRules = function (parentNode, rules) {
        this.globalRules[parentNode] = body_completer.compileBodyDescription(
            "GLOBAL." + parentNode, rules, this.globalBodyComponentFactories);
      };

      cls.getGlobalAutocompleteComponents = function (term, throwOnMissing) {
        var result = this.globalRules[term];
        if (_.isUndefined(result) && (throwOnMissing || _.isUndefined(throwOnMissing))) {
          throw new Error("failed to resolve global components for  ['" + term + "']");
        }
        return result;
      };

      cls.addEndpointDescription = function (endpoint, description) {

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
        copiedDescription.bodyAutocompleteRootComponents = body_completer.compileBodyDescription(
          copiedDescription.id, copiedDescription.data_autocomplete_rules, this.globalBodyComponentFactories);

        this.endpoints[endpoint] = copiedDescription;
      };

      cls.getEndpointDescriptionByEndpoint = function (endpoint) {
        return this.endpoints[endpoint];
      };


      cls.getTopLevelUrlCompleteComponents = function () {
        return this.urlPatternMatcher.getTopLevelComponents();
      };

      cls.getUnmatchedEndpointComponents = function () {
        return body_completer.globalsOnlyAutocompleteComponents();
      };

      cls.clear = function () {
        this.endpoints = {};
        this.globalRules = {};
      };
    }(Api.prototype));


    exports.Api = Api;
    return exports;
  }
);