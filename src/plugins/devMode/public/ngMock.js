var angular = require('angular');
if (angular.mocks) {
  throw new Error(
    'Don\'t require angular-mocks directly or the tests ' +
    'can\'t setup correctly, use the ngMock module instead.'
  );
}

require('angular-mocks');
module.exports = angular.mock;
