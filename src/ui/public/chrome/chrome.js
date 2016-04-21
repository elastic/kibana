
import _ from 'lodash';
import angular from 'angular';


import metadata from 'ui/metadata';
import 'babel-polyfill';
import $ from 'jquery';
import 'ui/timefilter';
import 'ui/private';
import 'ui/promises';
import 'ui/directives/kbn_src';
import 'ui/watch_multi';

import angularApi from './api/angular';
import appsApi from './api/apps';
import controlsApi from './api/controls';
import navApi from './api/nav';
import tabsApi from './api/tabs';
import templateApi from './api/template';
import themeApi from './api/theme';
import xsrfApi from './api/xsrf';

let chrome = {};
let internals = _.defaults(
  _.cloneDeep(metadata),
  {
    basePath: '',
    rootController: null,
    rootTemplate: null,
    showAppsLink: null,
    xsrfToken: null,
    brand: null,
    nav: [],
    applicationClasses: []
  }
);

$('<link>').attr({
  href: require('ui/images/elk.ico'),
  rel: 'shortcut icon'
}).appendTo('head');

appsApi(chrome, internals);
xsrfApi(chrome, internals);
navApi(chrome, internals);
angularApi(chrome, internals);
controlsApi(chrome, internals);
tabsApi(chrome, internals);
templateApi(chrome, internals);
themeApi(chrome, internals);

chrome.bootstrap = function () {
  chrome.setupAngular();
  angular.bootstrap(document, ['kibana']);
};

module.exports = chrome;
