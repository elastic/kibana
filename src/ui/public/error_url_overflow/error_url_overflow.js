import uiRoutes from 'ui/routes';
import KbnUrlProvider from 'ui/url';

import './error_url_overflow.less';
import template from './error_url_overflow.html';
import { UrlOverflowServiceProvider } from './url_overflow_service';

export * from './url_overflow_service';

uiRoutes
.when('/error/url-overflow', {
  template,
  controllerAs: 'controller',
  controller: class OverflowController {
    constructor(Private, config, $scope) {
      const kbnUrl = Private(KbnUrlProvider);
      const urlOverflow = Private(UrlOverflowServiceProvider);

      if (!urlOverflow.get()) {
        kbnUrl.redirectPath('/');
        return;
      }

      this.url = urlOverflow.get();
      this.limit = urlOverflow.failLength();
      $scope.$on('$destroy', () => urlOverflow.clear());
    }
  }
});
