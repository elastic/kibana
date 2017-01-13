import angular from 'angular';

export class ModalDialogue {
  /**
   *
   * @param html
   * @param scopeObject
   * @param $rootScope
   * @param $compile {function}
   */
  constructor(html, scopeObject, $rootScope, $compile) {
    this.modalScope = $rootScope.$new();

    Object.keys(scopeObject).forEach((key) => { this.modalScope[key] = scopeObject[key]; });

    this.innerElement = $compile(html)(this.modalScope);
    angular.element(document.body).append(this.innerElement);
  }

  /**
   * Removes the element from the dom.
   */
  destroy() {
    this.innerElement.remove();
    this.modalScope.$destroy();
  }
}
