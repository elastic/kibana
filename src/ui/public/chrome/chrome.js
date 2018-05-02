import _ from 'lodash';
import angular from 'angular';

import { metadata } from '../metadata';
import 'babel-polyfill';
import 'whatwg-fetch';
import 'custom-event-polyfill';
import '../timefilter';
import '../notify';
import '../private';
import '../promises';
import '../storage';
import '../directives/kbn_src';
import '../watch_multi';
import './services';

import { initAngularApi } from './api/angular';
import appsApi from './api/apps';
import controlsApi from './api/controls';
import { initChromeNavApi } from './api/nav';
import templateApi from './api/template';
import themeApi from './api/theme';
import translationsApi from './api/translations';
import { initChromeXsrfApi } from './api/xsrf';
import { initUiSettingsApi } from './api/ui_settings';
import { initLoadingCountApi } from './api/loading_count';

export const chrome = {};
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

initUiSettingsApi(chrome);
appsApi(chrome, internals);
initChromeXsrfApi(chrome, internals);
initChromeNavApi(chrome, internals);
initLoadingCountApi(chrome, internals);
initAngularApi(chrome, internals);
controlsApi(chrome, internals);
templateApi(chrome, internals);
themeApi(chrome, internals);
translationsApi(chrome, internals);

const waitForBootstrap = new Promise(resolve => {
  chrome.bootstrap = function () {
    chrome.setupAngular();
    angular.bootstrap(document.body, ['kibana']);
    resolve();
  };
});

/**
 * ---- ATTENTION: Read documentation carefully before using this! ----
 *
 * Returns a promise, that resolves with an instance of the currently used Angular
 * $injector service for usage outside of Angular.
 * You can use this injector to get access to any other injectable component (service,
 * constant, etc.) by using its get method.
 *
 * If you ever use Angular outside of an Angular context via this method, you should
 * be really sure you know what you are doing!
 *
 * When using this method inside your code, you will need to stub it while running
 * tests. Look into 'src/test_utils/public/stub_get_active_injector' for more information.
 */
chrome.dangerouslyGetActiveInjector = () => {
  return waitForBootstrap.then(() => {
    const $injector = angular.element(document.body).injector();
    if (!$injector) {
      return Promise.reject('document.body had no angular context after bootstrapping');
    }
    return $injector;
  });
};
