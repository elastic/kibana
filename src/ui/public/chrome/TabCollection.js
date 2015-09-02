var _ = require('lodash');
var Tab = require('ui/chrome/Tab');
var format = require('url').format;
var parse = _.wrap(require('url').parse, function (parse, path) {
  var parsed = parse(path, true);
  return {
    pathname: parsed.pathname,
    query: parsed.query || {},
    hash: parsed.hash
  };
});

function TabCollection() {

  var tabs = [];
  var specs = null;
  var defaults = null;
  var activeTab = null;

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
      return new Tab(_.defaults({}, spec, defaults));
    });
  };

  this.getActive = function () {
    return activeTab;
  };

  this.consumeRouteUpdate = function ($location, persist) {
    var url = parse($location.url(), true);
    var id = $location.path().split('/')[1] || '';

    tabs.forEach(function (tab) {
      var active = tab.active = (tab.id === id);
      var lastUrl = active ? url : parse(tab.lastUrl || tab.rootUrl);
      lastUrl.query._g = url.query._g;

      if (tab.active) activeTab = tab;
      if (persist) {
        tab.persistLastUrl(format(lastUrl));
      }
    });
  };
}

module.exports = TabCollection;
