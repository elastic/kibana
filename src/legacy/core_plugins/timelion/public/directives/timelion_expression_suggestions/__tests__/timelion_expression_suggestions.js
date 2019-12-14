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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import '../timelion_expression_suggestions';

describe('Timelion expression suggestions directive', function() {
  let scope;
  let $compile;

  beforeEach(ngMock.module('kibana'));

  beforeEach(inject(function($injector) {
    // eslint-disable-line no-undef
    $compile = $injector.get('$compile');
    scope = $injector.get('$rootScope').$new();
  }));

  describe('attributes', function() {
    describe('suggestions', function() {
      let element = null;
      const template = `<timelion-expression-suggestions
          suggestions="list"
        ></timelion-expression-suggestions>`;

      beforeEach(function() {
        element = $compile(template)(scope);
        scope.$apply(() => {
          scope.list = [{ name: 'suggestion1' }, { name: 'suggestion2' }, { name: 'suggestion3' }];
        });
      });

      it('are rendered', function() {
        expect(element.find('[data-test-subj="timelionSuggestionListItem"]').length).to.be(
          scope.list.length
        );
      });
    });
  });
});
