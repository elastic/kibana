import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';

import 'ui/filter_editor';

describe('Filter Editor Directive', function () {
  let html = '<filter-editor filter="filter" index-pattern="indexPattern"></filter-editor>';
  let $scope;
  let $compile;
  let element;
  let $rootScope;

  beforeEach(ngMock.module(
    'kibana',
    'kibana/courier',
    function ($provide) {
      $provide.service('courier', require('fixtures/mock_courier'));
    }
  ));

  beforeEach(ngMock.inject(function (_$compile_, _$rootScope_) {
    $compile = _$compile_;
    $scope = _$rootScope_.$new();
  }));

  beforeEach(function () {
    $scope.indexPattern = 'logstash-*';
    $scope.filter = {
      query: {
        match: {
          'machine.os': {
            query: 'Linux',
            type: 'phrase'
          }
        }
      }
    };

    element = $compile(html)($scope);
    $scope.$digest();
  });

  function boolFilter() {
    return angular.copy(element.scope().filter.bool);
  }

  it('converts to bool filter', function () {
    expect(boolFilter()).to.eql({
      must: [{
        match: {
          'machine.os': {
            query: 'Linux',
            type: 'phrase'
          }
        }
      }]
    });

    expect(element.find('.fe-expression')).to.have.length(1);
  });

  describe('.add()', function () {
    let expression = { match: { 'machine.os': 'OSX' } };

    it('has defaults arguments', function () {
      element.isolateScope().add();
      $scope.$digest();

      expect(boolFilter().should).to.eql([{
        match: {
          '@tags': ''
        }
      }]);
    });

    it('appends to existing clause', function () {
      element.isolateScope().add('must', expression);
      $scope.$digest();

      expect(boolFilter().must).to.have.length(2);
      expect(boolFilter().must[1]).to.eql(expression);
    });
  });

  describe('.remove()', function () {
    beforeEach(function () {
      element.isolateScope().add('must', { match: { 'machine.os': 'OSX' } });
      $scope.$digest();

      expect(boolFilter().must).to.have.length(2);
    });

    it('removes clause', function () {
      element.isolateScope().remove('must', 1);
      $scope.$digest();

      expect(boolFilter().must).to.have.length(1);
    });

    it('cleans up empty clause', function () {
      element.isolateScope().remove('must', 0);
      element.isolateScope().remove('must', 0);
      $scope.$digest();

      expect(boolFilter().must).to.be(undefined);
    });
  });

  describe('.changeClause()', function () {
    let expression = {
      match:{
        'machine.os': {
          query: 'Linux',
          type: 'phrase'
        }
      }
    };

    beforeEach(function () {
      element.isolateScope().add('should', expression);
      $scope.$digest();

      expect(boolFilter().should).to.have.length(1);
      expect(boolFilter().must).to.have.length(1);
    });

    it('moves to existing clause', function () {
      element.isolateScope().changeClause('must', 'should', expression);
      $scope.$digest();

      expect(boolFilter().should).to.have.length(2);
      expect(boolFilter().must).to.be(undefined);
    });

    it('moves to unexisting clause', function () {
      element.isolateScope().changeClause('must', 'should_not', expression);
      $scope.$digest();

      expect(boolFilter().should).to.have.length(1);
      expect(boolFilter().should_not).to.have.length(1);
      expect(boolFilter().must).to.be(undefined);
    });
  });

  describe('.changeField()', function () {
    it('updates field key', function () {
      element.isolateScope().changeField('name', element.scope().filter.bool.must[0]);
      $scope.$digest();

      expect(boolFilter().must[0].match['machine.os']).to.be(undefined);
      expect(boolFilter().must[0].match.name).to.eql({
        query: 'Linux', type: 'phrase'
      });
    });
  });

  describe('.changeFilterType', function () {
    it('goes from match to term', function () {
      element.isolateScope().changeFilterType('term', element.scope().filter.bool.must[0]);
      $scope.$digest();

      expect(boolFilter().must[0].term).to.eql({
        'machine.os': 'Linux'
      });

      expect(boolFilter().must[0].match).to.be(undefined);
    });

    it('goes from term to match', function () {
      let expression = { term: { 'machine.os': 'OSX' } };

      element.isolateScope().add('should', expression);
      element.isolateScope().changeFilterType('match', element.scope().filter.bool.should[0]);
      $scope.$digest();

      expect(boolFilter().should[0].match).to.eql(expression.term);
      expect(boolFilter().should[0].should).to.be(undefined);
    });

    it('handles going to the same type', function () {
      element.isolateScope().changeFilterType('match', element.scope().filter.bool.must[0]);
      $scope.$digest();

      expect(boolFilter().must[0].match).to.eql({
        'machine.os': {
          query: 'Linux',
          type: 'phrase'
        }
      });
    });
  });

  describe('rendering', function () {
    it('displays values', function () {
      expect(element.find('.fe-field')[0].value).to.be('string:machine.os');
      expect(element.find('.fe-clause')[0].value).to.be('string:must');
      expect(element.find('.fe-type')[0].value).to.be('string:match');
      expect(element.find('.fe-query')[0].value).to.be('Linux');
    });

    it('adds row', function () {
      element.find('[ng-click="add()"]').click();
      $scope.$digest();

      expect(element.find('.fe-inputs')).to.have.length(2);
    });

    it('duplicates row', function () {
      const expression = boolFilter().must[0];
      const keys = ['field', 'clause', 'type', 'query', 'inputs'];

      element.find('[ng-click="add(clause, expression)"]').click();
      $scope.$digest();

      // verifies values
      keys.forEach(function (key) {
        expect(element.find('.fe-' + key)[0].value)
          .to.be(element.find('.fe-' + key)[1].value);
      });

      expect(boolFilter().must[1]).to.eql(expression);
    });

    it('removes row', function () {
      element.find('[ng-click="remove(clause, $parent.$parent.$index)"]').click();
      $scope.$digest();

      expect(element.find('.fe-inputs')).to.have.length(0);
    });

    it('changes clause', function () {
      const clause = element.find('.fe-clause')[0];

      expect(clause.value).to.be('string:must');

      angular.element(clause).val('string:should').change();
      $scope.$digest();

      expect(boolFilter().must).to.be(undefined);
      expect(boolFilter().should).to.have.length(1);
    });

    it('changes field', function () {
      const field = element.find('.fe-field')[0];
      expect(field.value).to.be('string:machine.os');

      angular.element(field).val('string:ssl').change();
      $scope.$digest();

      expect(boolFilter().must).to.eql([{
        match: {
          ssl: {
            query: 'Linux',
            type: 'phrase'
          }
        }
      }]);
    });

    it('changes filter type', function () {
      const type = element.find('.fe-type')[0];
      expect(type.value).to.be('string:match');

      angular.element(type).val('string:term').change();
      $scope.$digest();

      expect(element.find('.fe-type')[0].value).to.be('string:term');
      expect(boolFilter().must).to.eql([{
        term: {
          'machine.os': 'Linux'
        }
      }]);
    });

    it('renders field options', function () {
      const options = element.find('.fe-field option');

      expect(options.length).to.be.above(10); // more fields could be added
      expect(options[0].value).to.be('string:@tags');
    });

    it('renders clause options', function () {
      const elements = element.find('.fe-clause option');
      const values = Array.prototype.slice.apply(elements).map(function (e) {
        return e.value;
      });

      expect(values).to.eql([
        'string:must',
        'string:must_not',
        'string:should'
      ]);
    });

    it('renders filter type options', function () {
      const elements = element.find('.fe-type option');
      const values = Array.prototype.slice.apply(elements).map(function (e) {
        return e.value;
      });

      expect(values).to.eql([
        'string:match',
        'string:term'
      ]);
    });
  });
});
