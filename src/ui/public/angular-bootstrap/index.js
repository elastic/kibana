
/* eslint-disable */

/**
 * TODO: Write custom components that address our needs to directly and deprecate these Bootstrap components.
 */

/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.12.1 - 2015-02-20
 * License: MIT
 */
angular.module('ui.bootstrap', [
  'ui.bootstrap.tpls',
  'ui.bootstrap.transition',
  'ui.bootstrap.collapse',
  'ui.bootstrap.alert',
  'ui.bootstrap.bindHtml',
  'ui.bootstrap.buttons',
  'ui.bootstrap.dateparser',
  'ui.bootstrap.position',
  'ui.bootstrap.datepicker',
  'ui.bootstrap.dropdown',
  'ui.bootstrap.modal',
  'ui.bootstrap.pagination',
  'ui.bootstrap.tooltip',
  'ui.bootstrap.popover',
  'ui.bootstrap.progressbar',
  'ui.bootstrap.rating',
  'ui.bootstrap.tabs',
  'ui.bootstrap.timepicker',
  'ui.bootstrap.typeahead'
]);

angular.module('ui.bootstrap.tpls', [
  'template/alert/alert.html',
  'template/datepicker/datepicker.html',
  'template/datepicker/day.html',
  'template/datepicker/month.html',
  'template/datepicker/popup.html',
  'template/datepicker/year.html',
  'template/modal/backdrop.html',
  'template/modal/window.html',
  'template/pagination/pager.html',
  'template/pagination/pagination.html',
  'template/tooltip/tooltip-html-unsafe-popup.html',
  'template/tooltip/tooltip-popup.html',
  'template/popover/popover.html',
  'template/progressbar/bar.html',
  'template/progressbar/progress.html',
  'template/progressbar/progressbar.html',
  'template/rating/rating.html',
  'template/tabs/tab.html',
  'template/tabs/tabset.html',
  'template/timepicker/timepicker.html',
  'template/typeahead/typeahead-match.html',
  'template/typeahead/typeahead-popup.html'
]);

import './accordion';
import './alert';
import './bindHtml';
import './buttons';
import './collapse';
import './dateparser';
import './datepicker';
import './dropdown';
import './modal';
import './pagination';
import './popover';
import './position';
import './progressbar';
import './rating';
import './tabs';
import './timepicker';
import './tooltip';
import './transition';
import './typeahead';

import alert from './alert/alert.html';

angular.module('template/alert/alert.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/alert/alert.html', alert);
}]);

import datepicker from './datepicker/datepicker.html';

angular.module('template/datepicker/datepicker.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/datepicker/datepicker.html', datepicker);
}]);

import day from './datepicker/day.html';

angular.module('template/datepicker/day.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/datepicker/day.html', day);
}]);

import month from './datepicker/month.html';

angular.module('template/datepicker/month.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/datepicker/month.html', month);
}]);

import popup from './datepicker/popup.html';

angular.module('template/datepicker/popup.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/datepicker/popup.html', popup);
}]);

import year from './datepicker/year.html';

angular.module('template/datepicker/year.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/datepicker/year.html', year);
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

import popover from './popover/popover.html';

angular.module('template/popover/popover.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/popover/popover.html', popover);
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

import rating from './rating/rating.html';

angular.module('template/rating/rating.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/rating/rating.html', rating);
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

import typeaheadMatch from './typeahead/typeahead-match.html';

angular.module('template/typeahead/typeahead-match.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/typeahead/typeahead-match.html', typeaheadMatch);
}]);

import typeaheadPopup from './typeahead/typeahead-popup.html';

angular.module('template/typeahead/typeahead-popup.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('template/typeahead/typeahead-popup.html', typeaheadPopup);
}]);

