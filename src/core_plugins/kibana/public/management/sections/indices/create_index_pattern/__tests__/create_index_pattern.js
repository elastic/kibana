import angular from 'angular';
import ngMock from 'ng_mock';
import jQuery from 'jquery';
import expect from 'expect.js';
import sinon from 'sinon';

import createIndexPatternTemplate from '../create_index_pattern.html';
import { StubIndexPatternsApiClientModule } from 'ui/index_patterns/__tests__/stub_index_patterns_api_client';
import { IndexPatternsApiClientProvider } from 'ui/index_patterns';
import MockLogstashFieldsProvider from 'fixtures/logstash_fields';

describe('createIndexPattern UI', () => {
  let setup;
  const trash = [];

  beforeEach(ngMock.module('kibana', StubIndexPatternsApiClientModule, ($provide) => {
    $provide.constant('buildSha', 'abc1234');
    $provide.constant('$route', {
      current: {
        params: {},
        locals: {
          indexPatterns: []
        }
      }
    });
  }));

  beforeEach(ngMock.inject(($injector) => {
    setup = function () {
      const Private = $injector.get('Private');
      const $compile = $injector.get('$compile');
      const $rootScope = $injector.get('$rootScope');

      const fields = Private(MockLogstashFieldsProvider);
      const indexPatternsApiClient = Private(IndexPatternsApiClientProvider);
      const $scope = $rootScope.$new();
      const $view = jQuery($compile(angular.element('<div>').html(createIndexPatternTemplate))($scope));
      trash.push(() => $scope.$destroy());
      $scope.$apply();

      const setNameTo = (name) => {
        $view.findTestSubject('createIndexPatternNameInput')
          .val(name)
          .change()
          .blur();

        // ensure that name successfully applied
        const form = $view.find('form').scope().form;
        expect(form.name).to.have.property('$viewValue', name);
      };

      return {
        $view,
        $scope,
        setNameTo,
        indexPatternsApiClient,
        fields
      };
    };
  }));

  afterEach(() => {
    trash.forEach(fn => fn());
    trash.length = 0;
  });

  describe('defaults', () => {
    it('renders `logstash-*` into the name input', () => {
      const { $view } = setup();

      const $name = $view.findTestSubject('createIndexPatternNameInput');
      expect($name).to.have.length(1);
      expect($name.val()).to.be('logstash-*');
    });

    it('attempts to getFieldsForWildcard for `logstash-*`', () => {
      const { indexPatternsApiClient } = setup();
      const { getFieldsForWildcard } = indexPatternsApiClient;

      sinon.assert.called(getFieldsForWildcard);
      const calledWithPattern = getFieldsForWildcard.getCalls().some(call => {
        const [params] = call.args;
        return (
          params &&
          params.pattern &&
          params.pattern === 'logstash-*'
        );
      });

      if (!calledWithPattern) {
        throw new Error('expected indexPatternsApiClient.getFieldsForWildcard to be called with pattern = logstash-*');
      }
    });

    it('loads the time fields into the select box', () => {
      const { $view, fields } = setup();

      const timeFieldOptions = $view.findTestSubject('createIndexPatternTimeFieldSelect')
        .find('option')
        .toArray()
        .map(option => option.innerText);

      fields.forEach((field) => {
        if (!field.scripted && field.type === 'date') {
          expect(timeFieldOptions).to.contain(field.name);
        } else {
          expect(timeFieldOptions).to.not.contain(field.name);
        }
      });
    });

    it('displays the option (off) to expand wildcards', () => {
      const { $view } = setup();
      const $enableExpand = $view.findTestSubject('createIndexPatternEnableExpand');
      expect($enableExpand).to.have.length(1);
      expect($enableExpand.is(':checked')).to.be(false);
    });
  });

  describe('cross cluster pattern', () => {
    it('name input accepts `cluster2:logstash-*` pattern', () => {
      const { $view, setNameTo } = setup();
      setNameTo('cluster2:logstash-*');

      const $name = $view.findTestSubject('createIndexPatternNameInput');
      const classes = [...$name.get(0).classList];
      expect(classes).to.contain('ng-valid');
      expect(classes).to.not.contain('ng-invalid');
    });

    it('removes the option to expand wildcards', () => {
      const { $view, setNameTo } = setup();
      setNameTo('cluster2:logstash-*');

      const $enableExpand = $view.findTestSubject('createIndexPatternEnableExpand');
      expect($enableExpand).to.have.length(0);
    });
  });
});
