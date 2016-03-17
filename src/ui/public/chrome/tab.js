import notify from 'ui/notify';
import _ from 'lodash';
import { escapeRegExp as reEsc } from 'lodash';
import { parse, format } from 'url';

const urlJoin = (a, b) => {
  if (!b) return a;
  return `${a}${ a.endsWith('/') ? '' : '/' }${b}`;
};

export default class Tab {
  constructor(spec = {}) {
    this.id = spec.id || '';
    this.title = spec.title || '';
    this.resetWhenActive = !!spec.resetWhenActive;
    this.activeIndicatorColor = spec.activeIndicatorColor || null;
    if (_.isFunction(this.activeIndicatorColor)) {
      // convert to a getter
      Object.defineProperty(this, 'activeIndicatorColor', {
        get: this.activeIndicatorColor
      });
    }

    this.active = false;

    this.baseUrl = spec.baseUrl || '/';
    this.rootUrl = urlJoin(this.baseUrl, this.id);
    this.rootRegExp = new RegExp(`^${reEsc(this.rootUrl)}(/|$|\\?|#)`);

    this.lastUrlStoreKey = `lastUrl:${this.id}`;
    this.lastUrlStore = spec.lastUrlStore;

    this.lastUrl = null;
    if (this.lastUrlStore) {
      this.lastUrl = this.lastUrlStore.getItem(this.lastUrlStoreKey);
      if (this.lastUrl && !this.lastUrl.startsWith(this.rootUrl)) {
        notify.log(`Found invalid lastUrl for tab with root url ${this.rootUrl}: "${this.lastUrl}"`);
        this.lastUrl = null;
        this.lastUrlStore.removeItem(this.lastUrlStoreKey);
      }
    }
  }

  href() {
    if (this.active) {
      return this.resetWhenActive ? this.rootUrl : null;
    }
    return this.lastUrl || this.rootUrl;
  }

  updateLastUrlGlobalState(globalState) {
    let lastPath = this.getLastPath();
    let { pathname, query, hash } = parse(lastPath, true);

    query = query || {};
    if (!globalState) delete query._g;
    else query._g = globalState;

    this.setLastUrl(`${this.rootUrl}${format({ pathname, query, hash })}`);
  }

  getLastPath() {
    let { id, rootUrl } = this;
    let lastUrl = this.getLastUrl();

    if (!lastUrl.startsWith(rootUrl)) {
      notify.log(`Tab "${id}" has invalid root "${rootUrl}" for last url "${lastUrl}"`);
      lastUrl = rootUrl;
    }

    return lastUrl.slice(rootUrl.length);
  }

  setLastUrl(url) {
    this.lastUrl = url;
    if (this.lastUrlStore) this.lastUrlStore.setItem(this.lastUrlStoreKey, this.lastUrl);
  }

  getLastUrl() {
    return this.lastUrl || this.rootUrl;
  }
}
