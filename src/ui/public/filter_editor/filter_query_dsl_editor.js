import 'ace';
import _ from 'lodash';
import { uiModules } from '../modules';
import template from './filter_query_dsl_editor.html';
import '../accessibility/kbn_ui_ace_keyboard_mode';

const module = uiModules.get('kibana');
module.directive('filterQueryDslEditor', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      isVisible: '=',
      filter: '=',
      onChange: '&'
    },
    link: {
      pre: function ($scope) {
        let aceEditor;

        $scope.queryDsl = _.omit($scope.filter, ['meta', '$state']);
        $scope.aceLoaded = function (editor) {
          aceEditor = editor;
          editor.$blockScrolling = Infinity;
          const session = editor.getSession();
          session.setTabSize(2);
          session.setUseSoftTabs(true);
        };

        $scope.$watch('isVisible', isVisible => {
          // Tell the editor to re-render itself now that it's visible, otherwise it won't
          // show up in the UI.
          if (isVisible && aceEditor) {
            aceEditor.renderer.updateFull();
          }
        });
      }
    }
  };
});
