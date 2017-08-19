import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';

const template = `
  <form name="person">
    <input data-test-subj="name" ng-model="name" required/>
    <ul>
      <li ng-repeat="task in tasks">
        <ng-form data-test-subj="{{'task-' + $index}}">
          <input data-test-subj="taskName" ng-model="task.name" required />
          <input data-test-subj="taskDesc" ng-model="task.description" required />
        </ng-form>
      </li>
    </ul>
  </form>
`;

describe('fancy forms', function () {
  let setup;
  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(($injector) => {
    const $rootScope = $injector.get('$rootScope');
    const $compile = $injector.get('$compile');

    setup = function (options = {}) {
      const {
        name = 'person1',
        tasks = []
      } = options;

      const $el = $(template);
      const $scope = $rootScope.$new();

      $scope.name = name;
      $scope.tasks = tasks;

      $compile($el)($scope);
      $scope.$apply();

      return {
        $el,
        $scope,
      };
    };
  }));

  describe('nested forms', function () {
    it('treats new fields as "soft" errors', function () {
      const { $scope } = setup({ name: '' });
      expect($scope.person.errorCount()).to.be(1);
      expect($scope.person.softErrorCount()).to.be(0);
    });

    it('new fields are no longer soft after blur', function () {
      const { $scope, $el } = setup({ name: '' });
      expect($scope.person.softErrorCount()).to.be(0);
      $el.findTestSubject('name').blur();
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

      $el.findTestSubject('taskDesc').first().blur();

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
        $task.findTestSubject('taskDesc').blur();
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
