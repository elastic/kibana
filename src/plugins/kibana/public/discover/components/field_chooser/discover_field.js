define(function (require) {
  const $ = require('jquery');
  const app = require('ui/modules').get('apps/discover');
  const html = require('plugins/kibana/discover/components/field_chooser/discover_field.html');
  const _ = require('lodash');

  require('ui/directives/css_truncate');
  require('ui/directives/field_name');


  app.directive('discoverField', function ($compile) {
    return {
      restrict: 'E',
      template: html,
      replace: true,
      link: function ($scope, $elem) {
        let detailsElem;
        let detailScope = $scope.$new();

        const detailsHtml = require('plugins/kibana/discover/components/field_chooser/lib/detail_views/string.html');

        const init = function () {
          if ($scope.field.details) {
            $scope.toggleDetails($scope.field, true);
          }
        };

        const getWarnings = function (field) {
          let warnings = [];

          if (!field.scripted) {
            if (!field.doc_values && field.type !== 'boolean' && !(field.analyzed && field.type === 'string')) {
              warnings.push('Doc values are not enabled on this field. This may lead to excess heap consumption when visualizing.');
            }

            if (field.analyzed && field.type === 'string') {
              warnings.push('This is an analyzed string field.' +
                ' Analyzed strings are highly unique and can use a lot of memory to visualize.' +
                ' Values such as foo-bar will be broken into foo and bar.');
            }

            if (!field.indexed) {
              warnings.push('This field is not indexed and can not be visualized.');
            }
          }


          if (field.scripted) {
            warnings.push('Scripted fields can take a long time to execute.');
          }

          if (warnings.length > 1) {
            warnings = warnings.map(function (warning, i) {
              return (i > 0 ? '\n' : '') + (i + 1) + ' - ' + warning;
            });
          }

          return warnings;

        };

        $scope.toggleDisplay = function (field) {
          // This is inherited from fieldChooser
          $scope.toggle(field.name);
          if (field.display) $scope.increaseFieldCounter(field);

          // we are now displaying the field, kill its details
          if (field.details) {
            $scope.toggleDetails(field);
          }
        };

        $scope.toggleDetails = function (field, recompute) {
          if (_.isUndefined(field.details) || recompute) {
            // This is inherited from fieldChooser
            $scope.details(field, recompute);
            detailScope.$destroy();
            detailScope = $scope.$new();
            detailScope.warnings = getWarnings(field);

            detailsElem = $(detailsHtml);
            $compile(detailsElem)(detailScope);
            $elem.append(detailsElem);
          } else {
            delete field.details;
            detailsElem.remove();
          }
        };

        init();
      }
    };
  });
});
