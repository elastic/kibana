define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana')
  .directive('paginate', function ($parse, $compile) {
    return {
      restrict: 'E',
      scope: true,
      link: {
        pre: function ($scope, $el) {
          if ($el.find('paginate-controls').size() === 0) {
            $el.append($compile('<paginate-controls>')($scope));
          }
        },
        post: function ($scope, $el, attrs) {
          var paginate = $scope.paginate;

          // add some getters to the controller powered by attributes
          paginate.getList = $parse(attrs.list);
          paginate.perPage = _.parseInt(attrs.perPage);
          paginate.perPageProp = attrs.perPageProp;
          paginate.otherWidthGetter = $parse(attrs.otherWidth);

          paginate.init();
        }
      },
      controllerAs: 'paginate',
      controller: function ($scope, config) {
        var self = this;
        var DEFAULT_PER_PAGE = _.parseInt(config.get('paginate:defaultPerPage')) || Infinity;

        // setup the watchers, called in the post-link function
        self.init = function () {
          setupTwoWayBindingOnPerPageProp();

          self.sizeOptions = getSizeOptions();

          $scope.$watch('page', self.changePage);
          $scope.$watchCollection(self.getList, function (list) {
            $scope.list = list;
            self.renderList();
          });
        };

        self.goToPage = function (number) {
          if (number) {
            if (number.hasOwnProperty('number')) number = number.number;
            $scope.page = $scope.pages[number - 1] || $scope.pages[0];
          }
        };

        self.renderList = function () {
          $scope.pages = [];
          if (!$scope.list) return;

          var perPage = _.parseInt(self.perPage);
          var count = perPage ? Math.ceil($scope.list.length / perPage) : 1;

          _.times(count, function (i) {
            var page;

            if (perPage) {
              var start = perPage * i;
              page = $scope.list.slice(start, start + perPage);
            } else {
              page = $scope.list.slice(0);
            }

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

        function getSizeOptions() {
          var opts = [
            { title: '10', value: 10 },
            { title: '25', value: 25 },
            { title: '100', value: 100 },
            { title: 'All', value: Infinity }
          ];

          function maybeAdd(val) {
            var missing = !opts.some(function (opt) {
              return opt.value === val;
            });

            if (missing) {
              opts.push({ title: '' + val, value: val });
              return true;
            }
            return false;
          }

          var added = 0;
          added += (maybeAdd(self.perPage) ? 1 : 0);
          added += (maybeAdd(DEFAULT_PER_PAGE) ? 1 : 0);
          if (added > 0) opts = _.sortBy(opts, 'value');

          return opts;
        }

        /**
         * Traverse up the parent scopes to find the one that contains the perPageProp,
         * then set the new value at that level.
         *
         * @param {number} val - the new value of perPage to pass up
         * @return {boolean} - true if we were able to find the parent, otherwise false
         */
        function setPerPage(val) {
          var $ppParent = $scope;

          while ($ppParent && !_.has($ppParent, self.perPageProp)) {
            $ppParent = $ppParent.$parent;
          }

          if ($ppParent) {
            $ppParent[self.perPageProp] = val;
            return true;
          }

          return false;
        }

        /**
         * When we are using a per-page value by reference, we do something
         * kind of sketchy. The property on scope that should be two-way bound
         * is sent via the per-page-prop attribute, and then read and written
         * to using this function and the setPerPage() function.
         *
         * why we didn't use:
         *   isolate scope — would prevent the inner template from accessing the parent scopes
         *   transclusion — would prevent the pagination directive from injecting the 'page' value
         *     into the inner templates scope
         *
         * @return {undefined}
         */
        function setupTwoWayBindingOnPerPageProp() {
          self.perPage = $scope[self.perPageProp];

          $scope.$watchMulti([
            'paginate.perPage',
            self.perPageProp,
          ], function (vals, oldVals) {
            var intChanges = vals[0] !== oldVals[0];
            var extChanges = vals[1] !== oldVals[1];

            if (intChanges) {
              if (!setPerPage(self.perPage)) {
                // if we are not able to set the external value,
                // render now, otherwise wait for the external value
                // to trigger the watcher again
                self.renderList();
              }
              return;
            }

            self.perPage = $scope[self.perPageProp];
            if (!self.perPage) {
              self.perPage = DEFAULT_PER_PAGE;
              return;
            }

            self.renderList();
          });
        }
      }
    };
  })
  .directive('paginateControls', function () {
    // this directive is automatically added by paginate if not found within it's $el
    return {
      restrict: 'E',
      template: require('text!partials/paginate_controls.html')
    };
  });


});