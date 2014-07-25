define(function (require) {
  var _ = require('lodash');
  var typeahead = require('modules').get('kibana/typeahead');
  var template = require('text!components/typeahead/partials/typeahead.html');

  require('components/notify/directives');

  typeahead.directive('kbnTypeahead', function () {
    var keyMap = {
      ESC: 27,
      UP: 38,
      DOWN: 40,
      TAB: 9,
      ENTER: 13
    };

    var eventDispatch = function (keyCode) {
      if (_.contains([keyMap.ESC], keyCode)) {
        console.log('close');
      }

      if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
        console.log('arrows');
      }

      if (_.contains([keyMap.ENTER, keyMap.TAB], keyCode)) {
        console.log('select');
      }
    };

    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      template: template,
      // require: 'ngModel',
      scope: {
        query: '=query',
        fullItemList: '=items',
      },

      controller: function ($scope) {
        $scope.items = $scope.fullItemList;

        $scope.$watch('query', function (query) {
          // $scope.items = $scope.fullItemList.filter(function (item) {
          //   var re = new RegExp(query, 'i');
          //   return !! (item.title.match(re));
          // });

          console.log(query);
        });
      },

      link: function ($scope, $el, attr, ngModel) {
        var input = $el.find('input').first();

        $el.on('keydown', function (ev) {
          var keyCode = ev.which || ev.keyCode;

          eventDispatch(keyCode);
        });
      }
    };
  });
});
