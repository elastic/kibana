define(function (require) {
  require('ui/collapsible_sidebar/collapsible_sidebar.less');

  var _ = require('lodash');
  var $ = require('jquery');

  require('ui/modules')
  .get('kibana')
  .directive('collapsibleSidebar', function () {
    // simply a list of all of all of angulars .col-md-* classes except 12
    var listOfWidthClasses = _.times(11, function (i) { return 'col-md-' + i; });

    return {
      restrict: 'C',
      link: function ($scope, $elem) {
        var $collapser = $('<div class="sidebar-collapser"><div class="chevron-cont"></div></div>');
        var $siblings = $elem.siblings();

        var siblingsClass = listOfWidthClasses.reduce(function (prev, className) {
          if (prev) return prev;
          return $siblings.hasClass(className) && className;
        }, false);

        $collapser.on('click', function () {
          $elem.toggleClass('closed');
          // if there is are only two elements we can assume the other one will take 100% of the width
          if ($siblings.length === 1 && siblingsClass) {
            $siblings.toggleClass(siblingsClass + ' col-md-12');
          }
        })

        .appendTo($elem);
      }
    };
  });
});
