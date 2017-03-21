import _ from 'lodash';
import uiModules from 'ui/modules';
import paginateControlsTemplate from 'ui/partials/paginate_controls.html';

uiModules.get('kibana')
.directive('paginate', function ($parse, $compile) {
  return {
    restrict: 'E',
    scope: true,
    link: {
      pre: function ($scope, $el, attrs) {
        if (_.isUndefined(attrs.bottomControls)) attrs.bottomControls = true;
        if ($el.find('paginate-controls.paginate-bottom').size() === 0 && attrs.bottomControls) {
          $el.append($compile('<paginate-controls class="paginate-bottom">')($scope));
        }
      },
      post: function ($scope, $el, attrs) {
        if (_.isUndefined(attrs.topControls)) attrs.topControls = false;
        if ($el.find('paginate-controls.paginate-top').size() === 0 && attrs.topControls) {
          $el.prepend($compile('<paginate-controls class="paginate-top">')($scope));
        }

        const paginate = $scope.paginate;

        // add some getters to the controller powered by attributes
        paginate.getList = $parse(attrs.list);
        paginate.perPageProp = attrs.perPageProp;

        if (attrs.perPage) {
          paginate.perPage = attrs.perPage;
          $scope.showSelector = false;
        } else {
          $scope.showSelector = true;
        }

        paginate.otherWidthGetter = $parse(attrs.otherWidth);

        paginate.init();
      }
    },
    controllerAs: 'paginate',
    controller: function ($scope, $document) {
      const self = this;
      const ALL = 0;

      self.sizeOptions = [
        { title: '10', value: 10 },
        { title: '25', value: 25 },
        { title: '100', value: 100 },
        { title: 'All', value: ALL }
      ];

      // setup the watchers, called in the post-link function
      self.init = function () {

        self.perPage = _.parseInt(self.perPage) || $scope[self.perPageProp];

        $scope.$watchMulti([
          'paginate.perPage',
          self.perPageProp,
          self.otherWidthGetter
        ], function (vals, oldVals) {
          const intChanges = vals[0] !== oldVals[0];

          if (intChanges) {
            if (!setPerPage(self.perPage)) {
              // if we are not able to set the external value,
              // render now, otherwise wait for the external value
              // to trigger the watcher again
              self.renderList();
            }
            return;
          }

          self.perPage = _.parseInt(self.perPage) || $scope[self.perPageProp];
          if (self.perPage == null) {
            self.perPage = ALL;
            return;
          }

          self.renderList();
        });

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

      self.goToTop = function goToTop() {
        $document.scrollTop(0);
      };

      self.renderList = function () {
        $scope.pages = [];
        if (!$scope.list) return;

        const perPage = _.parseInt(self.perPage);
        const count = perPage ? Math.ceil($scope.list.length / perPage) : 1;

        _.times(count, function (i) {
          let page;

          if (perPage) {
            const start = perPage * i;
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
        const width = +self.otherWidthGetter($scope) || 5;
        let left = page.i - Math.round((width - 1) / 2);
        let right = left + width - 1;

        // shift neg count from left to right
        if (left < 0) {
          right += 0 - left;
          left = 0;
        }

        // shift extra right nums to left
        const lastI = page.count - 1;
        if (right > lastI) {
          right = lastI;
          left = right - width + 1;
        }

        for (let i = left; i <= right; i++) {
          const other = $scope.pages[i];

          if (!other) continue;

          $scope.otherPages.push(other);
          if (other.last) $scope.otherPages.containsLast = true;
          if (other.first) $scope.otherPages.containsFirst = true;
        }
      };

      function setPerPage(val) {
        let $ppParent = $scope;

        while ($ppParent && !_.has($ppParent, self.perPageProp)) {
          $ppParent = $ppParent.$parent;
        }

        if ($ppParent) {
          $ppParent[self.perPageProp] = val;
          return true;
        }
      }
    }
  };
})
.directive('paginateControls', function () {
  // this directive is automatically added by paginate if not found within it's $el
  return {
    restrict: 'E',
    template: paginateControlsTemplate
  };
});
