define(function (require) {
  var module = require('modules').get('kibana');
  var _ = require('lodash');
  var rison = require('utils/rison');

  module.directive('savedObjectFinder', function (savedSearches, savedVisualizations, savedDashboards, $location, kbnUrl) {

    var vars = {
      searches: {
        service: savedSearches,
        noun: 'Saved Search',
        nouns: 'Saved Searches'
      },
      visualizations: {
        service: savedVisualizations,
        noun: 'Visualization'
      },
      dashboards: {
        service: savedDashboards,
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
      link: function ($scope, $el) {
        // the text input element
        var $input = $el.find('input[ng-model=filter]');

        // the list that will hold the suggestions
        var $list = $el.find('.finder-options');

        // the current filter string, used to check that retured results are still useful
        var currentFilter = $scope.filter;

        // the most recently entered search/filter
        var prevSearch;

        // the service we will use to find records
        var service;

        // the currently selected jQuery element
        var $selected = null;

        // the list of hits, used to render display
        $scope.hits = [];

        /**
         * Passed the hit objects and will determine if the
         * hit should have a url in the UI, returns it if so
         * @return {string|null} - the url or nothing
         */
        $scope.makeUrl = function (hit) {
          if ($scope.userMakeUrl) {
            return $scope.userMakeUrl(hit);
          }

          if (!$scope.userOnChoose) {
            return hit.url;
          }
        };

        /**
         * Called when a hit object is clicked, can override the
         * url behavior if necessary.
         */
        $scope.onChoose = function (hit, $event) {
          if ($scope.userOnChoose) {
            $scope.userOnChoose(hit, $event);
          }

          if ($event.isDefaultPrevented()) return;

          var url = $scope.makeUrl(hit);
          if (!url || url.charAt(0) !== '#') return;

          $event.preventDefault();

          // we want the '/path', not '#/path'
          kbnUrl.change(url.substr(1));
        };

        $scope.$watch('type', function (type) {
          type = vars[type];
          service = type.service;
          $scope.noun = type.noun;
          $scope.nouns = type.nouns || type.noun + 's';
          filterResults();
        });

        $scope.$watch('filter', function (newFilter) {
          // ensure that the currentFilter changes from undefined to ''
          // which triggers
          currentFilter = newFilter || '';
          filterResults();
        });

        $scope.selectedItem = false;
        $input.on('keydown', (function () {
          var enter = 13;
          var up = 38;
          var down = 40;
          var left = 37;
          var right = 39;
          var esc = 27;

          var scrollIntoView = function ($el, snapTop) {
            var el = $el[0];

            if (!el) return;

            if ('scrollIntoViewIfNeeded' in el) {
              el.scrollIntoViewIfNeeded(snapTop);
            } else if ('scrollIntoView' in el) {
              el.scrollIntoView(snapTop);
            }
          };

          return function (event) {
            var $next;
            var goingUp;

            switch (event.keyCode) {
            case 13: // enter
              if (!$selected) return;

              // get the index of the selected element
              var i = $list.find('li').index($selected);

              // get the related hit item
              var hit = $scope.hits[i];

              if (!hit) return;

              // check if there is a url for this hit
              var url = $scope.makeUrl(hit);

              if (url) window.location = url;
              $scope.onChoose(hit);

              return;
            case 38: // up
              $next = $selected ? $selected.prev() : $list.find('li:last-child');
              goingUp = false;
              break;
            case 40: // down
              $next = $selected ? $selected.next() : $list.find('li:first-child');
              goingUp = true;
              break;
            case 27: // esc
              scrollIntoView($list.find('li:first-child'));
              $next = null;
              break;
            default:
              return;
            }

            if ($next && $next.length === 0) {
              // we are at one of the ends
              return;
            }

            if ($selected && $next && $next.eq($selected).length) {
              // the selections are the same, bail
              return;
            }

            if ($selected) {
              $selected.removeClass('active');
              $selected = null;
            }

            if ($next) {
              // remove selection stuff from $selected
              $next.addClass('active');
              scrollIntoView($next, goingUp);
              $selected = $next;
            }
          };
        }()));

        $scope.$on('$destroy', function () {
          $input.off('keydown');
        });

        $scope.manageObject = function (type) {
          $location.url('/settings/objects?_a=' + rison.encode({tab: type}));
        };

        function filterResults() {
          if (!service) return;

          // track the filter that we use for this search,
          // but ensure that we don't search for the same
          // thing twice. This is called from multiple places
          // and needs to be smart about when it actually searches
          var filter = currentFilter;
          if (prevSearch === filter) return;

          prevSearch = filter;
          service.find(filter)
          .then(function (hits) {
            // ensure that we don't display old results
            // as we can't really cancel requests
            if (currentFilter === filter) {
              $scope.hitCount = hits.total;
              $scope.hits = hits.hits;
              $selected = null;
            }
          });
        }
      }
    };
  });
});