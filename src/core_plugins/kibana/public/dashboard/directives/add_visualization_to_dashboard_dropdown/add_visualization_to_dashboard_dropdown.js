import addVisualizationToDashboardDropdownTemplate
  from './add_visualization_to_dashboard_dropdown.html';
import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

module.directive('kbnAddVisualizationToDashboardDropdown', () => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      onAddVis: '=',
      onAddNewVis: '=',
      onAddSearch: '=',
    },
    template: addVisualizationToDashboardDropdownTemplate,
    link: function (scope) {
      scope.mode = 'visualization';
    }
  };
});
