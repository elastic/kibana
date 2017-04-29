import 'ui/collapsible_sidebar/collapsible_sidebar.less';
import _ from 'lodash';
import $ from 'jquery';
import { uiModules } from 'ui/modules';


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
          class="kuiCollapseButton sidebar-collapser"
        ></button>`
      );
      const $icon = $('<span class="kuiIcon fa-chevron-circle-left"></span>');
      $collapser.append($icon);
      const $siblings = $elem.siblings();

      const siblingsClass = listOfWidthClasses.reduce(function (prev, className) {
        if (prev) return prev;
        return $siblings.hasClass(className) && className;
      }, false);

      $collapser.on('click', function () {
        $elem.toggleClass('closed');

        if (isCollapsed) {
          isCollapsed = false;
          $icon.addClass('fa-chevron-circle-left');
          $icon.removeClass('fa-chevron-circle-right');
        } else {
          isCollapsed = true;
          $icon.removeClass('fa-chevron-circle-left');
          $icon.addClass('fa-chevron-circle-right');
        }

        // if there is are only two elements we can assume the other one will take 100% of the width
        if ($siblings.length === 1 && siblingsClass) {
          $siblings.toggleClass(siblingsClass + ' col-md-12');
        }
      })

      .appendTo($elem);
    }
  };
});
