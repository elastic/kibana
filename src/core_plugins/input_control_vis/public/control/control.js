import _ from 'lodash';

export function noValuesDisableMsg(fieldName, indexPatternName) {
  return `Filtering occurs on the "${fieldName}" field,
which doesn't exist on any documents in the "${indexPatternName}" index pattern.
Choose a different field or index documents that contain values for this field.`;
}

export class Control {
  constructor(controlParams, filterManager) {
    this.id = controlParams.id;
    this.options = controlParams.options;
    this.type = controlParams.type;
    this.label = controlParams.label ? controlParams.label : controlParams.fieldName;
    this.filterManager = filterManager;
    this.enable = true;
    // restore state from kibana filter context
    this.reset();
  }

  isEnabled() {
    return this.enable;
  }

  disable(reason) {
    this.enable = false;
    this.disabledReason = reason;
  }

  set(newValue) {
    this.value = newValue;
    this._hasChanged = true;
    if (this.hasValue()) {
      this._kbnFilter = this.filterManager.createFilter(this.value);
    } else {
      this._kbnFilter = null;
    }
  }

  reset() {
    this._hasChanged = false;
    this._kbnFilter = null;
    this.value = this.filterManager.getValueFromFilterBar();
  }

  clear() {
    this.set(this.filterManager.getUnsetValue());
  }

  hasChanged() {
    return this._hasChanged;
  }

  hasKbnFilter() {
    if (this._kbnFilter) {
      return true;
    }
    return false;
  }

  getKbnFilter() {
    return this._kbnFilter;
  }

  hasValue() {
    return !_.isEqual(this.value, this.filterManager.getUnsetValue());
  }
}
