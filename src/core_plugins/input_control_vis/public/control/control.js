import _ from 'lodash';

export function noValuesDisableMsg(fieldName, indexPatternName) {
  return `Filtering occurs on the "${fieldName}" field,
which doesn't exist on any documents in the "${indexPatternName}" index pattern.
Choose a different field or index documents that contain values for this field.`;
}

export class Control {
  constructor(controlParams, filterManager, kbnApi) {
    this.id = controlParams.id;
    this.options = controlParams.options;
    this.type = controlParams.type;
    this.label = controlParams.label ? controlParams.label : controlParams.fieldName;
    this.useTimeFilter = controlParams.useTimeFilter;
    this.filterManager = filterManager;
    this.kbnApi = kbnApi;

    // restore state from kibana filter context
    this.reset();
    // disable until initialized
    this.disable('Control has not been initialized');
  }

  async fetch() {
    throw new Error('fetch method not defined');
  }

  /**
   *
   * @param ancestors {array of Controls}
   */
  setAncestors(ancestors) {
    this.ancestors = ancestors;
  }

  hasAncestors() {
    return this.ancestors && this.ancestors.length > 0;
  }

  hasUnsetAncestor() {
    return this.ancestors.reduce((accumulator, ancestor) => {
      return accumulator || !ancestor.hasValue();
    }, false);
  }

  getAncestorSignature() {
    return this.ancestors.map(ancestor => {
      return ancestor.value;
    }).join(',');
  }

  getAncestorSearchSource() {
    let previousAncestorSearchSource;
    this.ancestors.forEach(ancestor => {
      if (!previousAncestorSearchSource) {
        previousAncestorSearchSource = new this.kbnApi.SearchSource();
        previousAncestorSearchSource.inherits(false);
        previousAncestorSearchSource.index(ancestor.filterManager.getIndexPattern());
        previousAncestorSearchSource.filter(() => {
          return ancestor.filterManager.createFilter(ancestor.value);
        });
      } else {
        const ancestorSearchSource = new this.kbnApi.SearchSource();
        ancestorSearchSource.inherits(previousAncestorSearchSource);
        ancestorSearchSource.index(ancestor.filterManager.getIndexPattern());
        ancestorSearchSource.filter(() => {
          return ancestor.filterManager.createFilter(ancestor.value);
        });
        previousAncestorSearchSource = ancestorSearchSource;
      }
    });
    return previousAncestorSearchSource;
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
