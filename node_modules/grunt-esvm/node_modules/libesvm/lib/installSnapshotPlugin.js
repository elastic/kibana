var _ = require('lodash');
var resolveLatestPluginSnapshot = require('./resolveLatestPluginSnapshotURL');
var getActualVersion = require('./getActualVersion');
module.exports = function (options, installPlugin, cb) {
  var log = options.log || _.noop;
  var path = options.path;
  var plugin = options.plugin;
	return getActualVersion(path)
	.then(function (version) {
		return resolveLatestPluginSnapshot(plugin, version);
	})
	.then(function (url) {
    options.plugin = _.cloneDeep(plugin);
    delete options.plugin.snapshot;
    delete options.plugin.staging;
    options.plugin.path = url;
    return installPlugin(options);
	})
	.nodeify(cb);
}
