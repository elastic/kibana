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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import testSubjSelector from '@kbn/test-subj-selector';
import sinon from 'sinon';
import $ from 'jquery';

const template = `
  <form name="person" ng-submit="onSubmit()">
    <input data-test-subj="name" ng-model="name" required/>
    <ul>
      <li ng-repeat="task in tasks">
        <ng-form data-test-subj="{{'task-' + $index}}">
          <input data-test-subj="taskName" ng-model="task.name" required />
          <input data-test-subj="taskDesc" ng-model="task.description" required />
        </ng-form>
      </li>
    </ul>
    <button data-test-subj="submit" type="submit">Submit</button>
  </form>
`;

describe('fancy forms', function () {
  let setup;
  const trash = [];

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    const $rootScope = $injector.get('$rootScope');
    const $compile = $injector.get('$compile');

    setup = function (options = {}) {
      const {
        name = 'person1',
        tasks = [],
        onSubmit = () => {},
      } = options;

      const $el = $(template).appendTo('body');
      trash.push(() => $el.remove());
      const $scope = $rootScope.$new();

      $scope.name = name;
      $scope.tasks = tasks;
      $scope.onSubmit = onSubmit;

      $compile($el)($scope);
      $scope.$apply();

      return {
        $el,
        $scope,
      };
    };
  }));

  afterEach(() => trash.splice(0).forEach(fn => fn()));

  describe('nested forms', function () {
    it('treats new fields as "soft" errors', function () {
      const { $scope } = setup({ name: '' });
      expect($scope.person.errorCount()).to.be(1);
      expect($scope.person.softErrorCount()).to.be(0);
    });

    it('upgrades fields to regular errors on attempted submit', function () {
      const { $scope, $el } = setup({ name: '' });

      expect($scope.person.errorCount()).to.be(1);
      expect($scope.person.softErrorCount()).to.be(0);
      $el.find(testSubjSelector('submit')).click();
      expect($scope.person.errorCount()).to.be(1);
      expect($scope.person.softErrorCount()).to.be(1);
    });

    it('prevents submit when there are errors', function () {
      const onSubmit = sinon.stub();
      const { $scope, $el } = setup({ name: '', onSubmit });

      expect($scope.person.errorCount()).to.be(1);
      sinon.assert.notCalled(onSubmit);
      $el.find(testSubjSelector('submit')).click();
      expect($scope.person.errorCount()).to.be(1);
      sinon.assert.notCalled(onSubmit);

      $scope.$apply(() => {
        $scope.name = 'foo';
      });

      expect($scope.person.errorCount()).to.be(0);
      sinon.assert.notCalled(onSubmit);
      $el.find(testSubjSelector('submit')).click();
      expect($scope.person.errorCount()).to.be(0);
      sinon.assert.calledOnce(onSubmit);
    });

    it('new fields are no longer soft after blur', function () {
      const { $scope, $el } = setup({ name: '' });
      expect($scope.person.softErrorCount()).to.be(0);
      $el.find(testSubjSelector('name')).blur();
      expect($scope.person.softErrorCount()).to.be(1);
    });

    it('counts errors/softErrors in sub forms', function () {
      const { $scope, $el } = setup();

      expect($scope.person.errorCount()).to.be(0);

      $scope.$apply(() => {
        $scope.tasks = [
          {
            name: 'foo',
            description: ''
          },
          {
            name: 'foo',
            description: ''
          }
        ];
      });

      expect($scope.person.errorCount()).to.be(2);
      expect($scope.person.softErrorCount()).to.be(0);

      $el.find(testSubjSelector('taskDesc')).first().blur();

      expect($scope.person.errorCount()).to.be(2);
      expect($scope.person.softErrorCount()).to.be(1);
    });

    it('only counts down', function () {
      const { $scope, $el } = setup({
        tasks: [
          {
            name: 'foo',
            description: ''
          },
          {
            name: 'bar',
            description: ''
          },
          {
            name: 'baz',
            description: ''
          }
        ]
      });

      // top level form sees 3 errors
      expect($scope.person.errorCount()).to.be(3);
      expect($scope.person.softErrorCount()).to.be(0);

      $el.find('ng-form').toArray().forEach((el, i) => {
        const $task = $(el);
        const $taskScope = $task.scope();
        const form = $task.controller('form');

        // sub forms only see one error
        expect(form.errorCount()).to.be(1);
        expect(form.softErrorCount()).to.be(0);

        // blurs only count locally
        $task.find(testSubjSelector('taskDesc')).blur();
        expect(form.softErrorCount()).to.be(1);

        // but parent form see them
        expect($scope.person.softErrorCount()).to.be(1);

        $taskScope.$apply(() => {
          $taskScope.task.description = 'valid';
        });

        expect(form.errorCount()).to.be(0);
        expect(form.softErrorCount()).to.be(0);
        expect($scope.person.errorCount()).to.be(2 - i);
        expect($scope.person.softErrorCount()).to.be(0);
      });
    });
  });
});
