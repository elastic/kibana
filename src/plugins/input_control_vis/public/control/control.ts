/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

import { Filter } from '@kbn/es-query';
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
  private kbnFilter: Filter | null = null;

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
    public useTimeFilter: boolean
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
    const indexPattern = this.filterManager.getIndexPattern();
    const field = this.filterManager.getField();
    if (field && indexPattern) {
      return indexPattern.getFormatterForField(field).convert(value);
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
    return this.ancestors.map((ancestor) => {
      return ancestor.value;
    });
  }

  getAncestorFilters() {
    return this.ancestors.map((ancestor) => {
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
