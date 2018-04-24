import _ from 'lodash';

class Api {
  constructor(name) {
    this.globalRules = {};
    this.endpoints = {};
    this.name = name;
  }
  addGlobalAutocompleteRules = function (parentNode, rules) {
    this.globalRules[parentNode] = rules;
  }
  addEndpointDescription(endpoint, description = {}) {
    let copiedDescription = {};
    if (this.endpoints[endpoint]) {
      console.warn(`Extending endpoint definition: ${endpoint}`);
      copiedDescription = { ...this.endpoints[endpoint] };
    }

    const url_params_def = {};
    _.each(description.patterns || [], function (p) {
      if (p.indexOf('{indices}') >= 0) {
        url_params_def.ignore_unavailable = '__flag__';
        url_params_def.allow_no_indices = '__flag__';
        url_params_def.expand_wildcards = ['open', 'closed'];
      }
    });

    if (url_params_def) {
      description.url_params = description.url_params || {};
      _.defaults(description.url_params, url_params_def);
    }

    _.extend(copiedDescription, description);
    _.defaults(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET']
    });
    this.endpoints[endpoint] = copiedDescription;
  }

  asJson() {
    return {
      'name': this.name,
      'globals': this.globalRules,
      'endpoints': this.endpoints
    };
  }

}

export default Api;
