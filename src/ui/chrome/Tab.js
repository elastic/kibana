var _ = require('lodash');
var storage = window.sessionStorage;

function Tab(spec) {
  this.id = spec.id;
  this.title = spec.title;
  this.active = false;
  this.resetWhenActive = !!spec.resetWhenActive;
  this.lastUrlStoreKey = spec.trackLastPath ? 'lastUrl:' + this.id : null;
  this.rootUrl = '/' + this.id;
  this.lastUrl = this.lastUrlStoreKey && storage.getItem(this.lastUrlStoreKey);

  this.activeIndicatorColor = spec.activeIndicatorColor || null;
  if (_.isFunction(this.activeIndicatorColor)) {
    // convert to a getter
    Object.defineProperty(this, 'activeIndicatorColor', {
      get: this.activeIndicatorColor
    });
  }
}

Tab.prototype.persistLastUrl = function (url) {
  if (!this.lastUrlStoreKey) return;
  this.lastUrl = url;
  storage.setItem(this.lastUrlStoreKey, this.lastUrl);
};

Tab.prototype.href = function () {
  if (this.active) {
    if (this.resetWhenActive) return '#' + this.rootUrl;
    return null;
  }

  return '#' + (this.lastUrl || this.rootUrl);
};

module.exports = Tab;
