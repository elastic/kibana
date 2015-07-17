define(function (require) {
  var _ = require('lodash');
  require('pegjs');
  console.log(PEG);
  var parser = PEG.buildParser(require('text!scripts/chain.peg'));
  return function () {
    return {
      restrict: 'A',
      scope: {
        expression: '='
      },
      link: function ($scope, $elem) {
        var valid = true;
        var checkInvalid = function (val) {
          try {
            parser.parse(val);
            $elem.css({color: '#555'});
            valid = true;
          } catch (e) {
            $elem.css({color: '#b66'});
            valid = false;
          }
        };
        var checkValid = _.debounce(checkInvalid, 750);


        $scope.$watch('expression', function (val) {
          if (valid) {
            checkValid(val);
          } else {
            checkInvalid(val);
          }

        });
      }
    };
  };

});