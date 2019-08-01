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
import React from 'react';
import ReactDOM from 'react-dom';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { getDocViewsSorted, DocViewRenderProps } from 'ui/registry/doc_views';
import { DocViewer } from './doc_viewer';

uiModules.get('apps/discover').directive('docViewer', () => {
  return {
    restrict: 'E',
    scope: {
      hit: '=',
      indexPattern: '=',
      filter: '=?',
      columns: '=?',
      onAddColumn: '=?',
      onRemoveColumn: '=?',
    },

    link: (scope: DocViewRenderProps, element: Element[]) => {
      const props = {
        columns: scope.columns,
        filter: scope.filter,
        indexPattern: scope.indexPattern,
        onAddColumn: scope.onAddColumn,
        onRemoveColumn: scope.onRemoveColumn,
        hit: scope.hit,
      };
      const docViews = getDocViewsSorted(scope.hit);
      ReactDOM.render(<DocViewer renderProps={props} docViews={docViews} />, element[0]);
    },
  };
});
