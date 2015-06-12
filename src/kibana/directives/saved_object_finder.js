define(function (require) {
  var module = require('modules').get('kibana');
  var _ = require('lodash');
  var rison = require('utils/rison');
  var keymap = require('utils/key_map');

  module.directive('savedObjectFinder', function (savedSearches, savedVisualizations, savedDashboards, $location, kbnUrl) {

    var types = {
      searches: {
        service: savedSearches,
        name: 'searches',
        noun: 'Saved Search'
      },
      visualizations: {
        service: savedVisualizations,
        name: 'visualizations',
        noun: 'Visualization'
      },
      dashboards: {
        service: savedDashboards,
        name: 'dashboards',
        noun: 'Dashboard'
      }
    };

    return {
      restrict: 'E',
      scope: {
        type: '@',
        title: '@?',
        // optional make-url attr, sets the userMakeUrl in our scope
        userMakeUrl: '=?makeUrl',
        // optional on-choose attr, sets the userOnChoose in our scope
        userOnChoose: '=?onChoose'
      },
      template: require('text!partials/saved_object_finder.html'),
      controllerAs: 'finder',
      controller: function ($scope, $element, $timeout) {
        var self = this;

        // the text input element
        var $input = $element.find('input[ng-model=filter]');

        // the list that will hold the suggestions
        var $list = $element.find('ul');

        // the current filter string, used to check that returned results are still useful
        var currentFilter = $scope.filter;

        // the most recently entered search/filter
        var prevSearch;

        // the service we will use to find records
        var service;

        // the list of hits, used to render display
        self.hits = [];

        self.objectType = types[$scope.type];

        filterResults();

        /**
         * Passed the hit objects and will determine if the
         * hit should have a url in the UI, returns it if so
         * @return {string|null} - the url or nothing
         */
        self.makeUrl = function (hit) {
          if ($scope.userMakeUrl) {
            return $scope.userMakeUrl(hit);
          }

          if (!$scope.userOnChoose) {
            return hit.url;
          }

          return '#';
        };

        /**
         * Called when a hit object is clicked, can override the
         * url behavior if necessary.
         */
        self.onChoose = function (hit, $event) {
          if ($scope.userOnChoose) {
            $scope.userOnChoose(hit, $event);
          }

          if ($event.isDefaultPrevented()) return;

          var url = self.makeUrl(hit);
          if (!url || url.charAt(0) !== '#') return;

          $event.preventDefault();

          // we want the '/path', not '#/path'
          kbnUrl.change(url.substr(1));
        };

        $scope.$watch('filter', function (newFilter) {
          // ensure that the currentFilter changes from undefined to ''
          // which triggers
          currentFilter = newFilter || '';
          filterResults();
        });

        //manages the state of the keyboard selector
        self.selector = {
          enabled: false,
          index: -1
        };

        //key handler for the filter text box
        self.filterKeyDown = function ($event) {
          if (keymap[$event.keyCode] !== 'tab')
            return;

          $timeout(function () {
            self.selector.index = 0;
            self.selector.enabled = true;

            $list.find('a:first').focus();
          });

          $event.preventDefault();
        };

        //key handler for the list items
        self.hitKeyDown = function ($event, page, paginate) {
          switch (keymap[$event.keyCode]) {
            case 'tab':
              if (!self.selector.enabled)
                break;

              self.selector.index = -1;
              self.selector.enabled = false;

              if ($event.shiftKey)
                $input.focus();

              $event.preventDefault();
              break;
            case 'down':
              if (!self.selector.enabled)
                break;

              if (self.selector.index + 1 < page.length) {
                self.selector.index += 1;
              }
              $event.preventDefault();
              break;
            case 'up':
              if (!self.selector.enabled)
                break;

              if (self.selector.index > 0) {
                self.selector.index -= 1;
              }
              $event.preventDefault();
              break;
            case 'right':
              if (!self.selector.enabled)
                break;

              if (page.number < page.count) {
                paginate.goToPage(page.number + 1);
                $timeout(function () {
                  self.selector.index = 0;
                  $list.find('a:first').focus();
                });
              }
              $event.preventDefault();
              break;
            case 'left':
              if (!self.selector.enabled)
                break;

              if (page.number > 1) {
                paginate.goToPage(page.number - 1);
                $timeout(function () {
                  self.selector.index = 0;
                  $list.find('a:first').focus();
                });
              }
              $event.preventDefault();
              break;
            case 'escape':
              if (!self.selector.enabled)
                break;

              $input.focus();
              $event.preventDefault();
              break;
            case 'enter':
              if (!self.selector.enabled)
                break;

              var hitIndex = ((page.number - 1) * paginate.perPage) + self.selector.index;
              var hit = self.hits[hitIndex];
              if (!hit)
                break;

              self.onChoose(hit, $event);
              $event.preventDefault();
              break;
            case 'shift':
              break;
            default:
              $input.focus();
              break;
          }
        };

        self.hitBlur = function ($event) {
          self.selector.index = -1;
          self.selector.enabled = false;
        };

        self.manageObjects = function (type) {
          $location.url('/settings/objects?_a=' + rison.encode({tab: type}));
        };

        function filterResults() {
          if (!self.objectType) return;
          if (!self.objectType.service) return;

          // track the filter that we use for this search,
          // but ensure that we don't search for the same
          // thing twice. This is called from multiple places
          // and needs to be smart about when it actually searches
          var filter = currentFilter;
          if (prevSearch === filter) return;

          prevSearch = filter;
          self.objectType.service.find(filter)
          .then(function (hits) {
            // ensure that we don't display old results
            // as we can't really cancel requests
            if (currentFilter === filter) {
              $scope.hitCount = hits.total;
              self.hits = _.sortBy(hits.hits, 'title');
            }
          });
        }

        function scrollIntoView($element, snapTop) {
          var el = $element[0];

          if (!el) return;

          if ('scrollIntoViewIfNeeded' in el) {
            el.scrollIntoViewIfNeeded(snapTop);
          } else if ('scrollIntoView' in el) {
            el.scrollIntoView(snapTop);
          }
        }
      }
    };
  });
});