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

import { esFilters } from '../../../../../plugins/data/public';
import { SearchSource as SearchSourceClass } from '../legacy_imports';
import { ControlParams, ControlParamsOptions, CONTROL_TYPES } from '../editor_utils';
import { RangeFilterManager } from './filter_manager/range_filter_manager';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';
import { FilterManager as BaseFilterManager } from './filter_manager/filter_manager';

export function noValuesDisableMsg(fieldName: string, indexPatternName: string) {
  return i18n.translate('inputControl.control.noValuesDisableTooltip', {
    defaultMessage:
      'Filtering occurs on the "{fieldName}" field, which doesn\'t exist on any documents in the "{indexPatternName}" \
index pattern. Choose a different field or index documents that contain values for this field.',
    values: { fieldName, indexPatternName },
  });
}

export function noIndexPatternMsg(indexPatternId: string) {
  return i18n.translate('inputControl.control.noIndexPatternTooltip', {
    defaultMessage: 'Could not locate index-pattern id: {indexPatternId}.',
    values: { indexPatternId },
  });
}

export abstract class Control<FilterManager extends BaseFilterManager> {
  private kbnFilter: esFilters.PhraseFilter | null = null;

  enable: boolean = false;
  disabledReason: string = '';
  value: any;

  id: string;
  options: ControlParamsOptions;
  type: CONTROL_TYPES;
  label: string;
  ancestors: Array<Control<PhraseFilterManager | RangeFilterManager>> = [];

  constructor(
    public controlParams: ControlParams,
    public filterManager: FilterManager,
    public useTimeFilter: boolean,
    public SearchSource: SearchSourceClass
  ) {
    this.id = controlParams.id;
    this.controlParams = controlParams;
    this.options = controlParams.options;
    this.type = controlParams.type;
    this.label = controlParams.label ? controlParams.label : controlParams.fieldName;

    // restore state from kibana filter context
    this.reset();
    // disable until initialized
    this.disable(
      i18n.translate('inputControl.control.notInitializedTooltip', {
        defaultMessage: 'Control has not been initialized',
      })
    );
  }

  abstract fetch(query: string): Promise<void>;

  abstract destroy(): void;

  format = (value: any) => {
    const field = this.filterManager.getField();
    if (field?.format?.convert) {
      return field.format.convert(value);
    }

    return value;
  };

  setAncestors(ancestors: Array<Control<PhraseFilterManager | RangeFilterManager>>) {
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

  disable(reason: string) {
    this.enable = false;
    this.disabledReason = reason;
  }

  set(newValue: any) {
    this.value = newValue;
    if (this.hasValue()) {
      this.kbnFilter = this.filterManager.createFilter(this.value);
    } else {
      this.kbnFilter = null;
    }
  }

  /*
   * Remove any user changes to value by resetting value to that as provided by Kibana filter pills
   */
  reset() {
    this.kbnFilter = null;
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
    if (this.kbnFilter) {
      return true;
    }
    return false;
  }

  getKbnFilter() {
    return this.kbnFilter;
  }

  hasValue(): boolean {
    return this.value !== undefined;
  }
}
