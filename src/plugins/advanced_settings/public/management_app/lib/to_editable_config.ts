/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicUiSettingsParams, UserProvidedValues, SavedObjectAttribute } from 'src/core/public';
import { FieldSetting } from '../types';
import { getValType } from './get_val_type';
import { getAriaName } from './get_aria_name';
import { DEFAULT_CATEGORY } from './default_category';

/**
 * @param {object} advanced setting definition object
 * @param {object} name of setting
 * @param {object} current value of setting
 * @returns {object} the editable config object
 */
export function toEditableConfig({
  def,
  name,
  value,
  isCustom,
  isOverridden,
}: {
  def: PublicUiSettingsParams & UserProvidedValues<any>;
  name: string;
  value: SavedObjectAttribute;
  isCustom: boolean;
  isOverridden: boolean;
}) {
  if (!def) {
    def = {};
  }

  const conf: FieldSetting = {
    name,
    displayName: def.name || name,
    ariaName: def.name || getAriaName(name),
    value,
    category: def.category && def.category.length ? def.category : [DEFAULT_CATEGORY],
    isCustom,
    isOverridden,
    readOnly: !!def.readonly,
    defVal: def.value,
    type: getValType(def, value),
    description: def.description,
    deprecation: def.deprecation,
    options: def.options,
    optionLabels: def.optionLabels,
    order: def.order,
    requiresPageReload: !!def.requiresPageReload,
    metric: def.metric,
  };

  return conf;
}
