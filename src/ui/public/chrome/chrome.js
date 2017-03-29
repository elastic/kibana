import _ from 'lodash';
import angular from 'angular';

import metadata from 'ui/metadata';
import 'babel-polyfill';
import 'ui/timefilter';
import 'ui/notify';
import 'ui/private';
import 'ui/promises';
import 'ui/storage';
import 'ui/directives/kbn_src';
import 'ui/watch_multi';
import './services';

import angularApi from './api/angular';
import appsApi from './api/apps';
import controlsApi from './api/controls';
import navApi from './api/nav';
import templateApi from './api/template';
import themeApi from './api/theme';
import translationsApi from './api/translations';
import xsrfApi from './api/xsrf';

const chrome = {};
const internals = _.defaults(
  _.cloneDeep(metadata),
  {
    basePath: '',
    rootController: null,
    rootTemplate: null,
    showAppsLink: null,
    xsrfToken: null,
    devMode: true,
    brand: null,
    nav: [],
    applicationClasses: []
  }
);

appsApi(chrome, internals);
xsrfApi(chrome, internals);
navApi(chrome, internals);
angularApi(chrome, internals);
controlsApi(chrome, internals);
templateApi(chrome, internals);
themeApi(chrome, internals);
translationsApi(chrome, internals);

chrome.bootstrap = function () {
  chrome.setupAngular();
  angular.bootstrap(document, ['kibana']);
};

module.exports = chrome;
