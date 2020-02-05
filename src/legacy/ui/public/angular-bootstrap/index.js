
/* eslint-disable */

/**
 * TODO: Write custom components that address our needs to directly and deprecate these Bootstrap components.
 */

import 'angular';

import { uiModules } from 'ui/modules';

uiModules.get('kibana', [
  'ui.bootstrap',
]);

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

import './bindHtml/bindHtml';
import './tooltip/tooltip';

import tooltipUnsafePopup from './tooltip/tooltip-html-unsafe-popup.html';	

angular.module('template/tooltip/tooltip-html-unsafe-popup.html', []).run(['$templateCache', function($templateCache) {	
 $templateCache.put('template/tooltip/tooltip-html-unsafe-popup.html', tooltipUnsafePopup);	
}]);	

import tooltipPopup from './tooltip/tooltip-popup.html';	

angular.module('template/tooltip/tooltip-popup.html', []).run(['$templateCache', function($templateCache) {	
 $templateCache.put('template/tooltip/tooltip-popup.html', tooltipPopup);	
}]);
