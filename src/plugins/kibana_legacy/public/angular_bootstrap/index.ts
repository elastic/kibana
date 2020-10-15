/* eslint-disable */

import { once } from 'lodash';
import angular from 'angular';

// @ts-ignore
import { initBindHtml } from './bind_html/bind_html';
// @ts-ignore
import { initBootstrapTooltip } from './tooltip/tooltip';

import tooltipPopup from './tooltip/tooltip_popup.html';

import tooltipUnsafePopup from './tooltip/tooltip_html_unsafe_popup.html';

export const initAngularBootstrap = once(() => {
  /*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.12.1 - 2015-02-20
 * License: MIT
 */
  angular.module('ui.bootstrap', [
    'ui.bootstrap.tpls',
    'ui.bootstrap.bindHtml',
    'ui.bootstrap.tooltip',
  ]);

  angular.module('ui.bootstrap.tpls', [
    'template/tooltip/tooltip-html-unsafe-popup.html',
    'template/tooltip/tooltip-popup.html',
  ]);

  initBindHtml();
  initBootstrapTooltip();

  angular.module('template/tooltip/tooltip-html-unsafe-popup.html', []).run([
    '$templateCache',
    function($templateCache: any) {
      $templateCache.put('template/tooltip/tooltip-html-unsafe-popup.html', tooltipUnsafePopup);
    },
  ]);

  angular.module('template/tooltip/tooltip-popup.html', []).run([
    '$templateCache',
    function($templateCache: any) {
      $templateCache.put('template/tooltip/tooltip-popup.html', tooltipPopup);
    },
  ]);
});
