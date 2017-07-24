import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';

// Load the kibana app dependencies.

let $rootScope;
let $compile;
let Private;
let config;
let $elemScope;
let $elem;

let cycleIndex = 0;
const markup = '<input ng-model="mockModel" parse-query input-focus type="text">';
let fromUser;
import { toUser } from 'ui/parse_query/lib/to_user';
import 'ui/parse_query';
import { ParseQueryLibFromUserProvider } from 'ui/parse_query/lib/from_user';

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($injector, _$rootScope_, _$compile_, _$timeout_, _Private_, _config_) {
    $compile = _$compile_;
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

    it('unless the object is empty, then convert it to an empty string', function () {
      expect(fromUser({})).to.eql('');
    });

    it('should pass through input strings that not start with {', function () {
      expect(fromUser('foo')).to.eql('foo');
      expect(fromUser('400')).to.eql('400');
      expect(fromUser('true')).to.eql('true');
    });

    it('should parse valid JSON and return the object instead of a string', function () {
      expect(fromUser('{}')).to.eql({});

      // invalid json remains a string
      expect(fromUser('{a:b}')).to.eql('{a:b}');
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

    it('should present string as strings', function () {
      expect(toUser('foo')).to.be('foo');
    });

    it('should present numbers as strings', function () {
      expect(toUser(400)).to.be('400');
    });
  });

});
