import uiModules from 'ui/modules';
import angular from 'angular';

const module = uiModules.get('kibana');

module.factory('ModalDialogue', function () {
  /**
   * The only thing this class does is load an element onto the dom when instantiated,
   * and removes it when destroy is called. Useful for the modal confirmation dialog.
   * Long term, some of the shared modal complexity could be moved in here, hence the name.
   */
  return class ModalDialogue {
    /**
     *
     * @param innerElement {HTMLElement} - an element that will be appended to the dom.
     */
    constructor(innerElement) {
      this.innerElement = innerElement;
      angular.element(document.body).append(this.innerElement);
    }

    /**
     * Removes the element from the dom.
     */
    destroy() {
      this.innerElement.remove();
    }
  };
});
