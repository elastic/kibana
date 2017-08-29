export class Control {
  constructor(controlParams, field, filterManager) {
    this.id = controlParams.id;
    this.options = controlParams.options;
    this.type = controlParams.type;
    this.label = controlParams.label ? controlParams.label : controlParams.fieldName;
    this.field = field;
    this.filterManager = filterManager;
    this.value = this.filterManager.getValueFromFilterBar();
  }
}
