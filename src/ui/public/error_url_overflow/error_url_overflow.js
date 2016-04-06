import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';

import './error_url_overflow.less';
import template from './error_url_overflow.html';

const key = 'error/url-overflow/url';
const store = window.sessionStorage || {
  getItem() {},
  setItem() {},
  removeItem() {},
};

export function OverflowedUrlStoreProvider() {
  let value = store.getItem(key);

  return {
    set(v) {
      value = v;
      store.setItem(key, value);
    },
    get() {
      return value;
    },
    clear() {
      value = null;
      store.removeItem(key);
    }
  };
}

uiRoutes
.when('/error/url-overflow', {
  template,
  controllerAs: 'controller',
  controller: class OverflowController {
    constructor(Private, config, $scope) {
      const overflowedUrlStore = Private(OverflowedUrlStoreProvider);
      this.url = overflowedUrlStore.get();

      if (!this.url) {
        window.location.hash = '#/';
        return;
      }

      this.limit = config.get('url:limit');

      $scope.$on('$destroy', () => overflowedUrlStore.clear());
    }
  }
});
