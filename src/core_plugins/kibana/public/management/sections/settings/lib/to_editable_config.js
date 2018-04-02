import { getValType } from './get_val_type';
import { getAriaName } from './get_aria_name';
import { DEFAULT_CATEGORY } from './default_category';

/**
 * @param {object} advanced setting definition object
 * @param {object} name of setting
 * @param {object} current value of setting
 * @returns {object} the editable config object
 */
export function toEditableConfig({ def, name, value, isCustom }) {
  if (!def) {
    def = {};
  }
  const conf = {
    name,
    displayName: def.name || name,
    ariaName: getAriaName(name),
    value,
    category: def.category && def.category.length ? def.category : [DEFAULT_CATEGORY],
    isCustom,
    readonly: !!def.readonly,
    defVal: def.value,
    type: getValType(def, value),
    description: def.description,
    options: def.options,
  };

  return conf;
}

