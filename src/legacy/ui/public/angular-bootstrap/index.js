
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
  'ui.bootstrap.alert',
  'ui.bootstrap.bindHtml',
  'ui.bootstrap.position',
  'ui.bootstrap.modal',
  'ui.bootstrap.pagination',
  'ui.bootstrap.tooltip',
  'ui.bootstrap.progressbar',
  'ui.bootstrap.timepicker',
  'ui.bootstrap.typeahead'
]);

angular.module('ui.bootstrap.tpls', [
  'template/alert/alert.html',
  'template/modal/backdrop.html',
  'template/modal/window.html',
  'template/pagination/pager.html',
  'template/pagination/pagination.html',
  'template/tooltip/tooltip-html-unsafe-popup.html',
  'template/tooltip/tooltip-popup.html',
  'template/progressbar/bar.html',
  'template/progressbar/progress.html',
  'template/progressbar/progressbar.html',
  'template/timepicker/timepicker.html',
  'template/typeahead/typeahead-match.html',
  'template/typeahead/typeahead-popup.html'
]);

import './alert/alert';
import './bindHtml/bindHtml';
import './modal/modal';
import './pagination/pagination';
import './position/position';
import './progressbar/progressbar';
import './timepicker/timepicker';
import './tooltip/tooltip';
import './transition/transition';
import './typeahead/typeahead';

import alert from './alert/alert.html';

angular.module('template/alert/alert.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/alert/alert.html', alert);
}]);

import backdrop from './modal/backdrop.html';

angular.module('template/modal/backdrop.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/modal/backdrop.html', backdrop);
}]);

import modal from './modal/window.html';

angular.module('template/modal/window.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/modal/window.html', modal);
}]);

import pager from './pagination/pager.html';

angular.module('template/pagination/pager.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/pagination/pager.html', pager);
}]);

import pagination from './pagination/pagination.html';

angular.module('template/pagination/pagination.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/pagination/pagination.html', pagination);
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

import timepicker from './timepicker/timepicker.html';

angular.module('template/timepicker/timepicker.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/timepicker/timepicker.html', timepicker);
}]);

import typeaheadMatch from './typeahead/typeahead-match.html';

angular.module('template/typeahead/typeahead-match.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/typeahead/typeahead-match.html', typeaheadMatch);
}]);

import typeaheadPopup from './typeahead/typeahead-popup.html';

angular.module('template/typeahead/typeahead-popup.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/typeahead/typeahead-popup.html', typeaheadPopup);
}]);
