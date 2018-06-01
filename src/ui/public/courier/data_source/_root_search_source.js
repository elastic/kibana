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

import { SearchSourceProvider } from './search_source';

export function RootSearchSourceProvider(Private, $rootScope, timefilter) {
  const SearchSource = Private(SearchSourceProvider);

  const globalSource = new SearchSource();
  globalSource.inherits(false); // this is the final source, it has no parents
  globalSource.filter(function (globalSource) {
    // dynamic time filter will be called in the _flatten phase of things
    const filter = timefilter.get(globalSource.get('index'));
    // Attach a meta property to it, that we check inside visualizations
    // to remove that timefilter again because we use our explicitly passed in one.
    // This should be removed as soon as we got rid of inheritance in SearchSource
    // across the boundary or visualization.
    if (filter) {
      filter.meta = { _globalTimefilter: true };
    }
    return filter;
  });

  let appSource; // set in setAppSource()
  resetAppSource();

  // when the route changes, clear the appSource
  $rootScope.$on('$routeChangeStart', resetAppSource);

  /**
   * Get the current AppSource
   * @return {Promise} - resolved with the current AppSource
   */
  function getAppSource() {
    return appSource;
  }

  /**
   * Set the current AppSource
   * @param {SearchSource} source - The Source that represents the applications "root" search source object
   */
  function setAppSource(source) {
    appSource = source;

    // walk the parent chain until we get to the global source or nothing
    // that's where we will attach to the globalSource
    let literalRoot = source;
    while (literalRoot._parent && literalRoot._parent !== globalSource) {
      literalRoot = literalRoot._parent;
    }

    literalRoot.inherits(globalSource);
  }



  /**
   * Sets the appSource to be a new, empty, SearchSource
   * @return {undefined}
   */
  function resetAppSource() {
    setAppSource(new SearchSource());
  }

  return {
    get: getAppSource,
    set: setAppSource,

    getGlobalSource: function () {
      return globalSource;
    }
  };
}
