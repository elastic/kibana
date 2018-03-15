let _ = require("lodash");
let Api = require('./api');
import { getSpec } from './spec'
let parts = [
  require('./es_5_0/aliases'),
  require('./es_5_0/aggregations'),
  require('./es_5_0/document'),
  require('./es_5_0/filter'),
  require('./es_5_0/nodes'),
  require('./es_5_0/globals'),
  require('./es_5_0/ingest'),
  require('./es_5_0/mappings'),
  require('./es_5_0/percolator'),
  require('./es_5_0/query'),
  require('./es_5_0/reindex'),
  require('./es_5_0/search'),
];

function ES_5_0() {
  Api.call(this, "es_5_0");
  _.each(parts, function (apiSection) {
    apiSection(this);
  }, this);

  const spec = getSpec()
  Object.keys(spec).forEach(endpoint => {
    this.addEndpointDescription(endpoint, spec[endpoint])
  })
}

ES_5_0.prototype = _.create(Api.prototype, { 'constructor': ES_5_0 });

(function (cls) {
  cls.addEndpointDescription = function (endpoint, description) {
    if (description) {
      var url_params_def = {};
      _.each(description.patterns || [], function (p) {
        if (p.indexOf("{indices}") >= 0) {
          url_params_def["ignore_unavailable"] = "__flag__";
          url_params_def["allow_no_indices"] = "__flag__";
          url_params_def["expand_wildcards"] = ["open", "closed"];
        }
      });

      if (url_params_def) {
        description.url_params = description.url_params || {};
        _.defaults(description.url_params, url_params_def);
      }
    }
    Object.getPrototypeOf(cls).addEndpointDescription.call(this, endpoint, description);
  };
})(ES_5_0.prototype);

const instance = new ES_5_0();

export default instance;
