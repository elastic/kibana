
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
  'ui.bootstrap.modal',
  'ui.bootstrap.tooltip',
  'ui.bootstrap.progressbar',
]);

angular.module('ui.bootstrap.tpls', [
  'template/modal/backdrop.html',
  'template/modal/window.html',	
  'template/tooltip/tooltip-html-unsafe-popup.html',	
  'template/tooltip/tooltip-popup.html',	
  'template/progressbar/bar.html',	
  'template/progressbar/progress.html',
  'template/progressbar/progressbar.html',
]);

import './bindHtml/bindHtml';
import './modal/modal';
import './progressbar/progressbar';
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

import bar from './progressbar/bar.html';	

 angular.module('template/progressbar/bar.html', []).run(['$templateCache', function($templateCache) {	
  $templateCache.put('template/progressbar/bar.html', bar);	
}]);	

import progress from './progressbar/progress.html';

angular.module('template/progressbar/progress.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/progressbar/progress.html', progress);
}]);

import progressbar from './progressbar/progressbar.html';

angular.module('template/progressbar/progressbar.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/progressbar/progressbar.html', progressbar);
}]);
