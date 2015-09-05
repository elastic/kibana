var _ = require('lodash');
var reEsc = require('lodash').escapeRegExp;

function Tab(spec = {}) {
  this.id = spec.id;
  this.title = spec.title;
  this.resetWhenActive = !!spec.resetWhenActive;
  this.trackLastUrl = !!spec.trackLastUrl;
  this.activeIndicatorColor = spec.activeIndicatorColor || null;
  if (_.isFunction(this.activeIndicatorColor)) {
    // convert to a getter
    Object.defineProperty(this, 'activeIndicatorColor', {
      get: this.activeIndicatorColor
    });
  }

  this.active = false;
  this.rootUrl = '/' + this.id;
  this.rootRegExp = new RegExp(`^${reEsc(this.rootUrl)}(/|$|\\?|#)`);
  this.store = spec.store || window.sessionStorage;

  this.lastUrlStoreKey = 'lastUrl:' + this.id;
  this.lastUrl = this.trackLastUrl && this.store.getItem(this.lastUrlStoreKey);
}

Tab.prototype.persistLastUrl = function (url) {
  if (!this.trackLastUrl) return;

  this.lastUrl = url;
  this.store.setItem(this.lastUrlStoreKey, this.lastUrl);
};

Tab.prototype.href = function () {
  if (this.active) {
    if (this.resetWhenActive) return '#' + this.rootUrl;
    return null;
  }

  return '#' + (this.lastUrl || this.rootUrl);
};

module.exports = Tab;
