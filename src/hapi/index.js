module.exports.extendHapi = require('./lib/extend_hapi');
module.exports.Plugin = require('./lib/plugin');
module.exports.start = require('./lib/start');

if (require.main === module) {
  module.exports.start().catch(function (err) {
    process.exit(1);
  });
}
