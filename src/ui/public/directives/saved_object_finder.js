import _ from 'lodash';
import rison from 'rison-node';
import keymap from 'ui/utils/key_map';
import SavedObjectsSavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import uiModules from 'ui/modules';
import savedObjectFinderTemplate from 'ui/partials/saved_object_finder.html';
let module = uiModules.get('kibana');

module.directive('savedObjectFinder', function ($location, $injector, kbnUrl, Private, config) {

  let services = Private(SavedObjectsSavedObjectRegistryProvider).byLoaderPropertiesName;

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
    template: savedObjectFinderTemplate,
    controllerAs: 'finder',
    controller: function ($scope, $element, $timeout) {
      let self = this;

      // the text input element
      let $input = $element.find('input[ng-model=filter]');

      // The number of items to show in the list
      $scope.perPage = config.get('savedObjects:perPage');

      // the list that will hold the suggestions
      let $list = $element.find('ul');

      // the current filter string, used to check that returned results are still useful
      let currentFilter = $scope.filter;

      // the most recently entered search/filter
      let prevSearch;

      // the list of hits, used to render display
      self.hits = [];

      self.service = services[$scope.type];
      self.properties = self.service.loaderProperties;

      filterResults();

      /**
       * Boolean that keeps track of whether hits are sorted ascending (true)
       * or descending (false) by title
       * @type {Boolean}
       */
      self.isAscending = true;

      /**
       * Sorts saved object finder hits either ascending or descending
       * @param  {Array} hits Array of saved finder object hits
       * @return {Array} Array sorted either ascending or descending
       */
      self.sortHits = function (hits) {
        self.isAscending = !self.isAscending;
        self.hits = self.isAscending ? _.sortBy(hits, 'title') : _.sortBy(hits, 'title').reverse();
      };

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

      self.preventClick = function ($event) {
        $event.preventDefault();
      };

      /**
       * Called when a hit object is clicked, can override the
       * url behavior if necessary.
       */
      self.onChoose = function (hit, $event) {
        if ($scope.userOnChoose) {
          $scope.userOnChoose(hit, $event);
        }

        let url = self.makeUrl(hit);
        if (!url || url === '#' || url.charAt(0) !== '#') return;

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
        switch (keymap[$event.keyCode]) {
          case 'tab':
            if (self.hitCount === 0) return;

            self.selector.index = 0;
            self.selector.enabled = true;

            selectTopHit();

            $event.preventDefault();
            break;
          case 'enter':
            if (self.hitCount !== 1) return;

            let hit = self.hits[0];
            if (!hit) return;

            self.onChoose(hit, $event);
            $event.preventDefault();
            break;
        }
      };

      //key handler for the list items
      self.hitKeyDown = function ($event, page, paginate) {
        switch (keymap[$event.keyCode]) {
          case 'tab':
            if (!self.selector.enabled) break;

            self.selector.index = -1;
            self.selector.enabled = false;

            //if the user types shift-tab return to the textbox
            //if the user types tab, set the focus to the currently selected hit.
            if ($event.shiftKey) {
              $input.focus();
            } else {
              $list.find('li.active a').focus();
            }

            $event.preventDefault();
            break;
          case 'down':
            if (!self.selector.enabled) break;

            if (self.selector.index + 1 < page.length) {
              self.selector.index += 1;
            }
            $event.preventDefault();
            break;
          case 'up':
            if (!self.selector.enabled) break;

            if (self.selector.index > 0) {
              self.selector.index -= 1;
            }
            $event.preventDefault();
            break;
          case 'right':
            if (!self.selector.enabled) break;

            if (page.number < page.count) {
              paginate.goToPage(page.number + 1);
              self.selector.index = 0;
              selectTopHit();
            }
            $event.preventDefault();
            break;
          case 'left':
            if (!self.selector.enabled) break;

            if (page.number > 1) {
              paginate.goToPage(page.number - 1);
              self.selector.index = 0;
              selectTopHit();
            }
            $event.preventDefault();
            break;
          case 'escape':
            if (!self.selector.enabled) break;

            $input.focus();
            $event.preventDefault();
            break;
          case 'enter':
            if (!self.selector.enabled) break;

            let hitIndex = ((page.number - 1) * paginate.perPage) + self.selector.index;
            let hit = self.hits[hitIndex];
            if (!hit) break;

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
        $location.url('/management/kibana/objects?_a=' + rison.encode({tab: type}));
      };

      self.hitCountNoun = function () {
        return ((self.hitCount === 1) ? self.properties.noun : self.properties.nouns).toLowerCase();
      };

      function selectTopHit() {
        setTimeout(function () {
          //triggering a focus event kicks off a new angular digest cycle.
          $list.find('a:first').focus();
        }, 0);
      }

      function filterResults() {
        if (!self.service) return;
        if (!self.properties) return;

        // track the filter that we use for this search,
        // but ensure that we don't search for the same
        // thing twice. This is called from multiple places
        // and needs to be smart about when it actually searches
        let filter = currentFilter;
        if (prevSearch === filter) return;

        prevSearch = filter;
        self.service.find(filter)
        .then(function (hits) {
          // ensure that we don't display old results
          // as we can't really cancel requests
          if (currentFilter === filter) {
            self.hitCount = hits.total;
            self.hits = _.sortBy(hits.hits, 'title');
          }
        });
      }

      function scrollIntoView($element, snapTop) {
        let el = $element[0];

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
