module.exports = function (kbnServer, server, config) {
  let _ = require('lodash');

  _.forOwn(config.unappliedDefaults, function (val, key) {
    if (val === null) return;
    server.log(['warning', 'config'], {
      tmpl: 'Settings for "<%= key %>" were not applied, check for spelling errors and ensure the plugin is loaded.',
      key: key,
      val: val
    });
  });
};
