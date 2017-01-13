import uiModules from 'ui/modules';
import { ModalDialogue } from './modal_dialogue';

const module = uiModules.get('kibana');

module.factory('ModalDialogue', function ($rootScope, $compile) {
  return class AngularModalDialogue extends ModalDialogue {
    constructor(html, scopeObject) {
      super(html, scopeObject, $rootScope, $compile);
    }
  };
});
