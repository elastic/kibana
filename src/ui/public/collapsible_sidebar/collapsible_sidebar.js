import './collapsible_sidebar.less';
import _ from 'lodash';
import $ from 'jquery';
import { uiModules } from '../modules';


uiModules
  .get('kibana')
  .directive('collapsibleSidebar', function () {
  // simply a list of all of all of angulars .col-md-* classes except 12
    const listOfWidthClasses = _.times(11, function (i) { return 'col-md-' + i; });

    return {
      restrict: 'C',
      link: function ($scope, $elem) {
        let isCollapsed = false;
        const $collapser = $(
          `<button
          data-test-subj="collapseSideBarButton"
          type="button"
          aria-expanded="true"
          aria-label="Toggle sidebar"
          class="kuiCollapseButton sidebar-collapser"
        ></button>`
        );
        // If the collapsable element has an id, also set aria-controls
        if ($elem.attr('id')) {
          $collapser.attr('aria-controls', $elem.attr('id'));
        }
        const $icon = $('<span class="kuiIcon fa-chevron-circle-left"></span>');
        $collapser.append($icon);
        const $siblings = $elem.siblings();

        const siblingsClass = listOfWidthClasses.reduce(function (prev, className) {
          if (prev) return prev;
          return $siblings.hasClass(className) && className;
        }, false);

        // If there is are only two elements we can assume the other one will take 100% of the width.
        const hasSingleSibling = $siblings.length === 1 && siblingsClass;

        $collapser.on('click', function () {
          if (isCollapsed) {
            isCollapsed = false;
            $elem.removeClass('closed');
            $icon.addClass('fa-chevron-circle-left');
            $icon.removeClass('fa-chevron-circle-right');
            $collapser.attr('aria-expanded', 'true');
          } else {
            isCollapsed = true;
            $elem.addClass('closed');
            $icon.removeClass('fa-chevron-circle-left');
            $icon.addClass('fa-chevron-circle-right');
            $collapser.attr('aria-expanded', 'false');
          }

          if (hasSingleSibling) {
            $siblings.toggleClass(siblingsClass + ' col-md-12');
          }

          if ($scope.toggleSidebar) $scope.toggleSidebar();
        });

        $collapser.appendTo($elem);
      }
    };
  });
