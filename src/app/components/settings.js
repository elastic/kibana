define(['underscore'],
function (_) {
  "use strict";

  return function Settings (options) {
    /**
     * To add a setting, you MUST define a default. Also,
     * THESE ARE ONLY DEFAULTS.
     * They are overridden by config.js in the root directory
     * @type {Object}
     */
    var defaults = {
      elasticsearch : {
        server: "http://"+window.location.hostname+":9200",
        withCredentials: false
      },
      panel_names   : [],
      kibana_index  : 'kibana-int'
    };

    if (typeof options['elasticsearch'] == 'string') {
      options['elasticsearch'] = { server: options['elasticsearch'] };
    }

    return _.extend(defaults, options);
  };
});
