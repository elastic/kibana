
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
  'ui.bootstrap.transition',
  'ui.bootstrap.bindHtml',
  'ui.bootstrap.dropdown',
  'ui.bootstrap.modal',
  'ui.bootstrap.tooltip',
  'ui.bootstrap.progressbar',
  'ui.bootstrap.tabs',
  'ui.bootstrap.timepicker',
]);

angular.module('ui.bootstrap.tpls', [
  'template/modal/backdrop.html',
  'template/modal/window.html',	
  'template/tooltip/tooltip-html-unsafe-popup.html',	
  'template/tooltip/tooltip-popup.html',
  'template/progressbar/progressbar.html',
  'template/tabs/tab.html',
  'template/tabs/tabset.html',
  'template/timepicker/timepicker.html',
]);

import './bindHtml/bindHtml';
import './dropdown/dropdown';
import './modal/modal';
import './progressbar/progressbar';
import './tabs/tabs';
import './timepicker/timepicker';
import './tooltip/tooltip';
import './transition/transition';

import backdrop from './modal/backdrop.html';

angular.module('template/modal/backdrop.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/modal/backdrop.html', backdrop);
}]);

import modal from './modal/window.html';

angular.module('template/modal/window.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/modal/window.html', modal);
}]);

import tooltipUnsafePopup from './tooltip/tooltip-html-unsafe-popup.html';	

angular.module('template/tooltip/tooltip-html-unsafe-popup.html', []).run(['$templateCache', function($templateCache) {	
 $templateCache.put('template/tooltip/tooltip-html-unsafe-popup.html', tooltipUnsafePopup);	
}]);	

import tooltipPopup from './tooltip/tooltip-popup.html';	

angular.module('template/tooltip/tooltip-popup.html', []).run(['$templateCache', function($templateCache) {	
 $templateCache.put('template/tooltip/tooltip-popup.html', tooltipPopup);	
}]);

import progressbar from './progressbar/progressbar.html';

angular.module('template/progressbar/progressbar.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/progressbar/progressbar.html', progressbar);
}]);

import tab from './tabs/tab.html';

angular.module('template/tabs/tab.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/tabs/tab.html', tab);
}]);

import tabset from './tabs/tabset.html';

angular.module('template/tabs/tabset.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/tabs/tabset.html', tabset);
}]);

import timepicker from './timepicker/timepicker.html';

angular.module('template/timepicker/timepicker.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/timepicker/timepicker.html', timepicker);
}]);
