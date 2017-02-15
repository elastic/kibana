import angular from 'angular';
import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';

// Load the kibana app dependencies.

let $rootScope;
let $timeout;
let $compile;
let Promise;
let Private;
let config;
let $elemScope;
let $elem;

let cycleIndex = 0;
const markup = '<input ng-model="mockModel" parse-query input-focus type="text">';
let fromUser;
import toUser from 'ui/parse_query/lib/to_user';
import 'ui/parse_query';
import ParseQueryLibFromUserProvider from 'ui/parse_query/lib/from_user';

const init = function () {
  // Load the application
  ngMock.module('kibana');

  ngMock.module('kibana', function ($provide) {
  });

  // Create the scope
  ngMock.inject(function ($injector, _$rootScope_, _$compile_, _$timeout_, _Promise_, _Private_, _config_) {
    $timeout = _$timeout_;
    $compile = _$compile_;
    Promise = _Promise_;
    Private = _Private_;
    config = _config_;

    // Give us a scope
    $rootScope = _$rootScope_;
  });
};

const compile = function () {
  $rootScope.mockModel = 'cycle' + cycleIndex++;
  $rootScope.mockQueryInput = undefined;

  $elem = angular.element(markup);
  $compile($elem)($rootScope);
  $elemScope = $elem.isolateScope();
  $rootScope.$digest();
};

describe('parse-query directive', function () {
  describe('initialization', function () {
    beforeEach(function () {
      init();
      compile();
    });

    it('should use the model', function () {
      expect($elemScope).to.have.property('ngModel');
    });
  });

  describe('user input parser', function () {

    beforeEach(function () {
      fromUser = Private(ParseQueryLibFromUserProvider);
      config.set('query:queryString:options', {});
    });

    it('should return the input if passed an object', function () {
      expect(fromUser({ foo: 'bar' })).to.eql({ foo: 'bar' });
    });

    it('unless the object is empty, that implies a match_all', function () {
      expect(fromUser({})).to.eql({ match_all: {} });
    });

    it('should treat an empty string as a match_all', function () {
      expect(fromUser('')).to.eql({ match_all: {} });
    });

    it('should merge in the query string options', function () {
      config.set('query:queryString:options', { analyze_wildcard: true });
      expect(fromUser('foo')).to.eql({ query_string: { query: 'foo', analyze_wildcard: true } });
    });

    it('should treat input that does not start with { as a query string', function () {
      expect(fromUser('foo')).to.eql({ query_string: { query: 'foo' } });
      expect(fromUser('400')).to.eql({ query_string: { query: '400' } });
      expect(fromUser('true')).to.eql({ query_string: { query: 'true' } });
    });

    it('should parse valid JSON', function () {
      expect(fromUser('{}')).to.eql({});
      expect(fromUser('{a:b}')).to.eql({ query_string: { query: '{a:b}' } });
    });
  });

  describe('model presentation formatter', function () {
    it('should present undefined as empty string', function () {
      let notDefined;
      expect(toUser(notDefined)).to.be('');
    });

    it('should present null as empty string', function () {
      expect(toUser(null)).to.be('');
    });

    it('should present objects as strings', function () {
      expect(toUser({ foo: 'bar' })).to.be('{"foo":"bar"}');
    });

    it('should present query_string queries as strings', function () {
      expect(toUser({ query_string: { query: 'lucene query string' } })).to.be('lucene query string');
    });

    it('should present query_string queries without a query as an empty string', function () {
      expect(toUser({ query_string: {} })).to.be('');
    });

    it('should present match_all queries without a boost as an empty string', function () {
      expect(toUser({ match_all: {} })).to.be('');
    });

    it('should present match_all queries with a boost as a match_all query', function () {
      expect(toUser({ match_all: { boost: 1.2 } })).to.be('{"match_all":{"boost":1.2}}');
    });

    it('should present string as strings', function () {
      expect(toUser('foo')).to.be('foo');
    });

    it('should present numbers as strings', function () {
      expect(toUser(400)).to.be('400');
    });
  });

});
