define(function (require) {
  var Tab = require('components/chrome/Tab');

  function TabCollection() {
    var _ = require('lodash');

    var all = [];
    var activeTab = null;

    this.set = function (tabSpecs) {
      _.invoke(all.splice(0), 'destroy');

      _.each(tabSpecs, function (tabSpec) {
        all.push(new Tab(tabSpec));
      });
    };

    this.get = function () {
      return all;
    };

    this.getActive = function () {
      return activeTab;
    };

    this.trackPathUpdate = function (path, temporaryChange) {
      var id = path.split('/')[1];

      all.forEach(function (tab) {
        tab.active = (tab.id === id);
        if (tab.active) {
          activeTab = tab;
          if (!temporaryChange) {
            tab.pathUpdate(path);
          }
        }
      });
    };
  }

  return TabCollection;
});
