/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint-disable no-multi-str*/

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export function noValuesDisableMsg(fieldName, indexPatternName) {
  return i18n.translate('inputControl.control.noValuesDisableTooltip', {
    defaultMessage:
      'Filtering occurs on the "{fieldName}" field, which doesn\'t exist on any documents in the "{indexPatternName}" \
index pattern. Choose a different field or index documents that contain values for this field.',
    values: { fieldName: fieldName, indexPatternName: indexPatternName },
  });
}

export function noIndexPatternMsg(indexPatternId) {
  return i18n.translate('inputControl.control.noIndexPatternTooltip', {
    defaultMessage: 'Could not locate index-pattern id: {indexPatternId}.',
    values: { indexPatternId },
  });
}

export class Control {
  constructor(controlParams, filterManager, kbnApi, useTimeFilter) {
    this.id = controlParams.id;
    this.controlParams = controlParams;
    this.options = controlParams.options;
    this.type = controlParams.type;
    this.label = controlParams.label ? controlParams.label : controlParams.fieldName;
    this.useTimeFilter = useTimeFilter;
    this.filterManager = filterManager;
    this.kbnApi = kbnApi;

    // restore state from kibana filter context
    this.reset();
    // disable until initialized
    this.disable(
      i18n.translate('inputControl.control.notInitializedTooltip', {
        defaultMessage: 'Control has not been initialized',
      })
    );
  }

  async fetch() {
    throw new Error('fetch method not defined, subclass are required to implement');
  }

  destroy() {
    throw new Error('destroy method not defined, subclass are required to implement');
  }

  format = value => {
    const field = this.filterManager.getField();
    if (field) {
      return field.format.convert(value);
    }

    return value;
  };

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

  getAncestorValues() {
    return this.ancestors.map(ancestor => {
      return ancestor.value;
    });
  }

  getAncestorFilters() {
    return this.ancestors.map(ancestor => {
      return ancestor.filterManager.createFilter(ancestor.value);
    });
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
    if (this.hasValue()) {
      this._kbnFilter = this.filterManager.createFilter(this.value);
    } else {
      this._kbnFilter = null;
    }
  }

  /*
   * Remove any user changes to value by resetting value to that as provided by Kibana filter pills
   */
  reset() {
    this._kbnFilter = null;
    this.value = this.filterManager.getValueFromFilterBar();
  }

  /*
   * Clear any filter on the field by setting the control value to undefined.
   */
  clear() {
    this.value = undefined;
  }

  hasChanged() {
    return !_.isEqual(this.value, this.filterManager.getValueFromFilterBar());
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
    return this.value !== undefined;
  }
}
