import _ from 'lodash';
import template from './filter_pill.html';
import { uiModules } from '../../modules';

const module = uiModules.get('kibana');

module.directive('filterPill', function () {
  return {
    template,
    restrict: 'E',
    scope: {
      filter: '=',
      onToggleFilter: '=',
      onPinFilter: '=',
      onInvertFilter: '=',
      onDeleteFilter: '=',
      onEditFilter: '=',
    },
    bindToController: true,
    controllerAs: 'pill',
    controller: function filterPillController() {

      this.activateActions = () => {
        this.areActionsActivated = true;
      };

      this.deactivateActions = () => {
        this.areActionsActivated = false;
      };

      this.isControlledByPanel = () => {
        return _.has(this.filter, 'meta.controlledBy');
      };

    }
  };
});

