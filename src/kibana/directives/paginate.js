define(function (require) {
  var _ = require('lodash');

  var module = require('modules').get('kibana/directives');

  module.directive('paginate', function ($parse) {
    return {
      restrict: 'E',
      transclude: true,
      template: '<div class="paginate-content" ng-transclude></div>' +
        '<paginate-controls ng-if="page.count > 1"></paginate-controls>'
      ,
      link: function ($scope, $el, attrs) {
        // pagination controls
        $scope.paginate = {
          perPage: _.parseInt(attrs.perPage)
        };

        $scope.$watch(attrs.list, function (list) {
          $scope.pages = [];
          if (!list) return;

          var perPage = $scope.paginate.perPage;
          var count = Math.ceil(list.length / perPage);

          _.times(count, function (i) {
            var start = perPage * i;
            var page = list.slice(start, start + perPage);

            page.number = i + 1;
            page.i = i;

            page.count = count;
            page.first = page.number === 1;
            page.last = page.number === count;

            page.prev = $scope.pages[i - 1];
            if (page.prev) page.prev.next = page;

            $scope.pages.push(page);
          });

          // set the new page, or restore the previous page number
          if ($scope.page && $scope.page.i < $scope.pages.length) {
            $scope.page = $scope.pages[$scope.page.i];
          } else {
            $scope.page = $scope.pages[0];
          }
        });

        $scope.$watch('page', function (newPage, oldPage) {
          if (!newPage) {
            delete $scope.otherPages;
            return;
          }

          if (newPage === oldPage) return;

          // setup the list of the other pages to link to
          $scope.otherPages = [];
          var left = Math.max(newPage.i - 2, 0);
          _.times(5, function (i) {
            var otherI = left + i;
            var other = $scope.pages[otherI];

            if (!other) return;

            $scope.otherPages.push(other);
            if (other.last) $scope.otherPages.containsLast = true;
            if (other.first) $scope.otherPages.containsFirst = true;
          });
        });

        $scope.goToPage = function (number) {
          if (number.hasOwnProperty('number')) number = number.number;
          $scope.page = $scope.pages[number - 1] || $scope.pages[0];
        };
      }
    };
  });

  module.directive('paginateControls', function () {
    return {
      restrict: 'E',
      template: require('text!../partials/paginate_controls.html')
    };
  });
});