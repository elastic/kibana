var _ = require('lodash');
var $ = require('jquery');
var grammar = require('raw!./chain.peg');
var PEG = require('pegjs');
var Parser = PEG.buildParser(grammar);

var app = require('ui/modules').get('apps/timelion', []);

app.directive('timelionExpression', function ($compile) {
  return {
    restrict: 'A',
    scope: {
      timelionExpression: '='
    },
    link: function ($scope, $elem) {
      $scope.$watch('timelionExpression', function (val) {
        try {
          Parser.parse(val);
        } catch (e) {
          console.log(e);
        }
      });
    }
  };
});