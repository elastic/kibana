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

import angular from 'angular';
import _ from 'lodash';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import 'ui/private';

import { DocViewsRegistryProvider } from 'ui/registry/doc_views';
import { uiRegistry } from 'ui/registry/_registry';

describe('docViewer', function () {
  let stubRegistry;
  let $elem;
  let init;

  beforeEach(function () {
    ngMock.module('kibana', function (PrivateProvider) {
      stubRegistry = uiRegistry({
        index: ['name'],
        order: ['order'],
        constructor() {
          this.forEach(docView => {
            docView.shouldShow = docView.shouldShow || _.constant(true);
            docView.name = docView.name || docView.title;
          });
        }
      });

      PrivateProvider.swap(DocViewsRegistryProvider, stubRegistry);
    });

    // Create the scope
    ngMock.inject(function () {});
  });

  beforeEach(function () {
    $elem = angular.element('<doc-viewer></doc-viewer>');
    init = function init() {
      ngMock.inject(function ($rootScope, $compile) {
        $compile($elem)($rootScope);
        $elem.scope().$digest();
        return $elem;
      });
    };

  });

  describe('injecting views', function () {

    function registerExtension(def = {}) {
      stubRegistry.register(function () {
        return _.defaults(def, {
          title: 'exampleView',
          order: 0,
          directive: {
            template: `Example`
          }
        });
      });
    }
    it('should have a tab for the view', function () {
      registerExtension();
      registerExtension({ title: 'exampleView2' });
      init();
      expect($elem.find('.euiTabs button').length).to.be(2);
    });

    it('should activate the first view in order', function () {
      registerExtension({ order: 2 });
      registerExtension({ title: 'exampleView2' });
      init();
      expect($elem.find('.euiTabs .euiTab-isSelected').text().trim()).to.be('exampleView2');
    });
  });
});
