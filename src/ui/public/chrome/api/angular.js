/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Fragment } from 'react';
import _ from 'lodash';
import { modifyUrl } from 'ui/url';

import { uiModules } from '../../modules';
import { toastNotifications } from '../../notify';
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
      .run(internals.$setupBreadcrumbsAutoClear)
      .run(internals.$initNavLinksDeepWatch)
      .run(($location, $rootScope, Private, config) => {
        chrome.getFirstPathSegment = () => {
          return $location.path().split('/')[1];
        };

        const urlOverflow = Private(UrlOverflowServiceProvider);
        const check = () => {
          // disable long url checks when storing state in session storage
          if (config.get('state:storeInSessionStorage')) {
            return;
          }

          if ($location.path() === '/error/url-overflow') {
            return;
          }

          try {
            if (urlOverflow.check($location.absUrl()) <= URL_LIMIT_WARN_WITHIN) {
              toastNotifications.addWarning({
                title: 'The URL is big and Kibana might stop working',
                text: (
                  <Fragment>
                    Either enable the <code>state:storeInSessionStorage</code> option
                    in <a href="#/management/kibana/settings">advanced settings</a> or
                    simplify the onscreen visuals.
                  </Fragment>
                ),
              });
            }
          } catch (e) {
            window.location.href = modifyUrl(window.location.href, parts => {
              parts.hash = '#/error/url-overflow';
            });
            // force the browser to reload to that Kibana's potentially unstable state is unloaded
            window.location.reload();
          }
        };

        $rootScope.$on('$routeUpdate', check);
        $rootScope.$on('$routeChangeStart', check);
      });

    directivesProvider(chrome, internals);

    uiModules.link(kibana);
  };

}
