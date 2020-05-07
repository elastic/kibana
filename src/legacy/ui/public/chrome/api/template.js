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

// eslint-disable-next-line import/no-default-export
export default function(chrome, internals) {
  /**
   * ui/chrome Template API
   *
   *   Root Template
   *     The root template is rendered within the primary chrome ui and should
   *     be used when building an app that is more of a page, or to override the
   *     placement of ng-view. When including a root template, the mark-up will
   *     look something like this:
   *
   *     body
   *       notifs
   *       div.content
   *         nav
   *         config
   *         div.application
   *           <-- your template here -->
   *
   *   Root Controller
   *     To attach a controller to the root of ui/chrome's content area, outside of
   *     where it attaches the ng-view directive (assuming no rootTemplate is used)
   *     which will allow cause the controller to persist across views or make for
   *     a simple place to define some quick global functionality for a very simple
   *     app (like the status page).
   */

  /**
   * @param {string} template
   * @return {chrome}
   */
  chrome.setRootTemplate = function(template) {
    internals.rootTemplate = template;
    return chrome;
  };

  /**
   * @param {string} as - the name that the controller should bind to
   * @param {Function} controller - the controller initializer function
   * @return {chrome}
   */
  chrome.setRootController = function(as, controllerName) {
    if (controllerName === undefined) {
      controllerName = as;
      as = null;
    }

    if (typeof controllerName === 'function') {
      chrome.$$rootControllerConstruct = controllerName;
      controllerName = 'chrome.$$rootControllerConstruct';
    }

    internals.rootController = controllerName + (as ? ' as ' + as : '');
    return chrome;
  };
}
