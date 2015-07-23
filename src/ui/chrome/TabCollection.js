define(function (require) {
  var Tab = require('ui/chrome/Tab');

  function TabCollection() {
    var _ = require('lodash');

    var tabs = null;
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

    this.trackUrlUpdate = function (url, persist) {
      var id = url.split('/')[1] || '';

      tabs.forEach(function (tab) {
        tab.active = (tab.id === id);
        if (!tab.active) return;

        activeTab = tab;
        if (persist) tab.persistLastUrl(url);
      });
    };
  }

  return TabCollection;
});
