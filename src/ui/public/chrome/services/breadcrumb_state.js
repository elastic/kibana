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

import { uiModules } from '../../modules';
import { Observable } from 'rxjs';

let shouldClear = false; // flag used to keep track of clearing between route changes
let observer;

// Observable used by Header component to subscribe to breadcrumbs changes.
export const observable = Observable.create((o) => observer = o);

/**
 * Should be called by plugins to set breadcrumbs in the header navigation.
 *
 * @param breadcrumbs: Array<Breadcrumb> where Breadcrumb has shape
 *                     { text: '', href?: '' }
 */
export const set = (breadcrumbs) => {
  if (observer) {
    observer.next(breadcrumbs);
  }

  // If a plugin called set, don't clear on route change.
  shouldClear = false;
};


uiModules.get('kibana')
  .service('breadcrumbState', ($rootScope) => {
    // When a route change happens we want to clear the breadcrumbs ONLY if
    // the new route does not set any breadcrumbs. Deferring the clearing until
    // the route finishes changing helps avoiding the breadcrumbs from 'flickering'.
    $rootScope.$on('$routeChangeStart', () => shouldClear = true);
    $rootScope.$on('$routeChangeSuccess', () => {
      if (shouldClear) {
        set([]);
      }
    });

    return { observable, set };
  });
