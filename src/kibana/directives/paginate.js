define(function (require) {
  var _ = require('lodash');

  var PER_PAGE_DEFAULT = 10;

  require('modules').get('kibana')
  .directive('paginate', function ($parse, $compile) {
    return {
      restrict: 'E',
      scope: true,
      controllerAs: 'paginate',
      link: {
        pre: function ($scope, $el) {
          if ($el.find('paginate-controls').size() === 0) {
            $el.append($compile('<paginate-controls>')($scope));
          }
        },
        post: function ($scope, $el, attrs) {
          var paginate = $scope.paginate;

          // add some getters to the controller powered by attributes
          paginate.otherWidthGetter = $parse(attrs.otherWidth);
          paginate.perPageGetter = $parse(attrs.perPage);
          paginate.perPageSetter = paginate.perPageGetter.assign;

          $scope.$watch(attrs.perPage, function (perPage) {
            paginate.perPage = perPage || PER_PAGE_DEFAULT;
          });
          $scope.$watch('paginate.perPage', paginate.renderList);
          $scope.$watch('page', paginate.changePage);

          $scope.$watchCollection(attrs.list, function (list) {
            $scope.list = list;
            paginate.renderList();
          });

        },
      },
      controller: function ($scope) {

        var self = this;

        self.goToPage = function (number) {
          if (number) {
            if (number.hasOwnProperty('number')) number = number.number;
            $scope.page = $scope.pages[number - 1] || $scope.pages[0];
          }
        };

        self.renderList = function () {
          $scope.pages = [];
          if (!$scope.list) return;

          var perPage = self.perPage;
          var count = Math.ceil($scope.list.length / perPage);

          _.times(count, function (i) {
            var start = perPage * i;
            var page = $scope.list.slice(start, start + perPage);

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
        };

        self.changePage = function (page) {
          if (!page) {
            $scope.otherPages = null;
            return;
          }

          // setup the list of the other pages to link to
          $scope.otherPages = [];
          var width = +self.otherWidthGetter($scope) || 5;
          var left = page.i - Math.round((width - 1) / 2);
          var right = left + width - 1;

          // shift neg count from left to right
          if (left < 0) {
            right += 0 - left;
            left = 0;
          }

          // shift extra right nums to left
          var lastI = page.count - 1;
          if (right > lastI) {
            right = lastI;
            left = right - width + 1;
          }

          for (var i = left; i <= right; i++) {
            var other = $scope.pages[i];

            if (!other) continue;

            $scope.otherPages.push(other);
            if (other.last) $scope.otherPages.containsLast = true;
            if (other.first) $scope.otherPages.containsFirst = true;
          }
        };
      }
    };
  })
  .directive('paginateControls', function () {
    // this directive is automatically added by paginate if not found within it's $el
    return {
      restrict: 'E',
      template: require('text!partials/paginate_controls.html'),
      link: function ($scope, $el) {
        $scope.$watch('page.count > 0', function (show) {
          $el.toggle(show);
        });
      }
    };
  });


});