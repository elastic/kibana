import _ from 'lodash';
import { format as formatUrl, parse as parseUrl } from 'url';

import { uiModules } from '../../modules';
import { Notifier } from '../../notify';
import { UrlOverflowServiceProvider } from '../../error_url_overflow';

import { directivesProvider } from '../directives';

const URL_LIMIT_WARN_WITHIN = 1000;

export function initAngularApi(chrome, internals) {
  chrome.getFirstPathSegment = _.noop;

  chrome.setupAngular = function () {
    const kibana = uiModules.get('kibana');

    _.forOwn(chrome.getInjected(), function (val, name) {
      kibana.value(name, val);
    });

    kibana
      .value('kbnVersion', internals.version)
      .value('buildNum', internals.buildNum)
      .value('buildSha', internals.buildSha)
      .value('serverName', internals.serverName)
      .value('sessionId', Date.now())
      .value('chrome', chrome)
      .value('esUrl', (function () {
        const a = document.createElement('a');
        a.href = chrome.addBasePath('/elasticsearch');
        return a.href;
      }()))
      .config($locationProvider => {
        $locationProvider.html5Mode({
          enabled: false,
          requireBase: false,
          rewriteLinks: false,
        });
      })
      .config(chrome.$setupXsrfRequestInterceptor)
      .config(function ($compileProvider, $locationProvider) {
        if (!internals.devMode) {
          $compileProvider.debugInfoEnabled(false);
        }

        $locationProvider.hashPrefix('');
      })
      .run(internals.capture$httpLoadingCount)
      .run(($location, $rootScope, Private, config) => {
        chrome.getFirstPathSegment = () => {
          return $location.path().split('/')[1];
        };

        const notify = new Notifier();
        const urlOverflow = Private(UrlOverflowServiceProvider);
        const check = () => {
        // disable long url checks when storing state in session storage
          if (config.get('state:storeInSessionStorage')) return;
          if ($location.path() === '/error/url-overflow') return;

          try {
            if (urlOverflow.check($location.absUrl()) <= URL_LIMIT_WARN_WITHIN) {
              notify.directive({
                template: `
                <p>
                  The URL has gotten big and may cause Kibana
                  to stop working. Please either enable the
                  <code>state:storeInSessionStorage</code>
                  option in the <a href="#/management/kibana/settings">advanced
                  settings</a> or simplify the onscreen visuals.
                </p>
              `
              }, {
                type: 'error',
                actions: [{ text: 'close' }]
              });
            }
          } catch (e) {
            const { host, path, search, protocol } = parseUrl(window.location.href);
            // rewrite the entire url to force the browser to reload and
            // discard any potentially unstable state from before
            window.location.href = formatUrl({ host, path, search, protocol, hash: '#/error/url-overflow' });
          }
        };

        $rootScope.$on('$routeUpdate', check);
        $rootScope.$on('$routeChangeStart', check);
      });

    directivesProvider(chrome, internals);

    uiModules.link(kibana);
  };

}
