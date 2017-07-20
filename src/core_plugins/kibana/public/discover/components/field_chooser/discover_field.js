import $ from 'jquery';
import html from 'plugins/kibana/discover/components/field_chooser/discover_field.html';
import _ from 'lodash';
import 'ui/directives/css_truncate';
import 'ui/directives/field_name';
import 'ui/accessibility/kbn_accessible_click';
import detailsHtml from 'plugins/kibana/discover/components/field_chooser/lib/detail_views/string.html';
import { uiModules } from 'ui/modules';
const app = uiModules.get('apps/discover');

app.directive('discoverField', function ($compile) {
  return {
    restrict: 'E',
    template: html,
    replace: true,
    scope: {
      field: '=',
      onAddField: '=',
      onAddFilter: '=',
      onRemoveField: '=',
      onShowDetails: '=',
    },
    link: function ($scope, $elem) {
      let detailsElem;
      let detailScope;


      const init = function () {
        if ($scope.field.details) {
          $scope.toggleDetails($scope.field, true);
        }
      };

      const getWarnings = function (field) {
        let warnings = [];

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
        if (field.display) {
          $scope.onRemoveField(field.name);
        } else {
          $scope.onAddField(field.name);
        }

        if (field.details) {
          $scope.toggleDetails(field);
        }
      };

      $scope.onClickToggleDetails = function onClickToggleDetails($event, field) {
        // Do nothing if the event originated from a child.
        if ($event.currentTarget !== $event.target) {
          $event.preventDefault();
        }

        $scope.toggleDetails(field);
      };

      $scope.toggleDetails = function (field, recompute) {
        if (_.isUndefined(field.details) || recompute) {
          $scope.onShowDetails(field, recompute);
          detailScope = $scope.$new();
          detailScope.warnings = getWarnings(field);

          detailsElem = $(detailsHtml);
          $compile(detailsElem)(detailScope);
          $elem.append(detailsElem).addClass('active');
        } else {
          delete field.details;
          detailScope.$destroy();
          detailsElem.remove();
          $elem.removeClass('active');
        }
      };

      init();
    }
  };
});
