import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';

import './error_url_overflow.less';
import template from './error_url_overflow.html';

export function OverflowedUrlStoreProvider() {
  let value;
  return {
    set(v) { value = v; },
    get() { return value; },
    clear() { value = null; }
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
      overflowedUrlStore.clear();

      if (!this.url) {
        window.location.hash = '#/';
        return;
      }

      this.limit = config.get('url:limit');
    }
  }
});
