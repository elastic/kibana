import uiModules from 'ui/modules';
import template from './grok_pattern_definitions.html';
import './grok_pattern_definitions.less';

const app = uiModules.get('kibana');

app.directive('grokPatternDefinitions', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      definitions: '=',
      onChange: '&'
    },
    controller : function ($scope) {
      if ($scope.definitions.length === 0) {
        $scope.definitions.push({});
      }
    }
  };
});
