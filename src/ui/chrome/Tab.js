define(function (require) {
  var _ = require('lodash');
  var sessionStorage = window.sessionStorage;

  function Tab(spec) {
    this.id = spec.id;
    this.title = spec.title;
    this.active = false;
    this.resetWhenActive = !!spec.resetWhenActive;
    this.storeKey = spec.trackLastPath ? 'lastPath:' + this.id : null;
    this.rootPath = '/' + this.id;
    this.lastPath = this.storeKey && sessionStorage.getItem(this.storeKey);

    this.activeIndicatorColor = spec.activeIndicatorColor || null;
    if (_.isFunction(this.activeIndicatorColor)) {
      // convert to a getter
      Object.defineProperty(this, 'activeIndicatorColor', {
        get: this.activeIndicatorColor
      });
    }
  }

  Tab.prototype.pathUpdate = function (path) {
    if (!this.storeKey) return;
    this.lastPath = path;
    sessionStorage.setItem(this.storeKey, this.lastPath);
  };

  Tab.prototype.href = function () {
    if (this.active) {
      if (this.resetWhenActive) return '#' + this.rootPath;
      return null;
    }

    return '#' + (this.lastPath || this.rootPath);
  };

  return Tab;
});
