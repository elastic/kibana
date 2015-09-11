var _ = require('lodash');
var { startsWith } = require('lodash');
var Tab = require('ui/chrome/Tab');
var { format, parse } = require('url');

parse = _.wrap(parse, function (parse, path) {
  var parsed = parse(path, true);
  return {
    pathname: parsed.pathname,
    query: parsed.query || {},
    hash: parsed.hash
  };
});

function TabCollection(opts = {}) {

  var tabs = [];
  var specs = null;
  var defaults = {};
  var activeTab = null;
  var store = opts.store || window.sessionStorage;

  this.set = function (_specs) {
    specs = _.cloneDeep([].concat(_specs || []));
    this._rebuildTabs();
  };

  this.setDefaults = function () {
    defaults = _.clone(arguments[0]);
    this._rebuildTabs();
  };

  this.get = function () {
    return [].concat(tabs || []);
  };

  this._rebuildTabs = function () {
    _.invoke(this.get(), 'destroy');
    tabs = _.map(specs, function (spec) {
      return new Tab(_.defaults({}, spec, defaults, { store }));
    });
  };

  this.getActive = function () {
    return activeTab;
  };

  this.consumeRouteUpdate = function (appId, path, persist) {
    var currentUrl = parse(path, true);

    tabs.forEach(function (tab) {
      tab.active = tab.rootRegExp.test(path);

      var lastUrl = tab.active ? currentUrl : parse(tab.lastUrl || tab.rootUrl);
      lastUrl.query._g = currentUrl.query._g;

      if (tab.active) activeTab = tab;
      if (persist) {
        tab.persistLastUrl(format(lastUrl));
      }
    });
  };
}

module.exports = TabCollection;
