import angular from 'angular';
import 'angular-mocks';
import 'mocha';

if (angular.mocks) {
  throw new Error(
    'Don\'t require angular-mocks directly or the tests ' +
    'can\'t setup correctly, use the ngMock module instead.'
  );
}

module.exports = angular.mock;
