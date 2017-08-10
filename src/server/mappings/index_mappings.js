import { cloneDeep, isPlainObject } from 'lodash';

import { formatListAsProse } from '../../utils';
import { getRootProperties, getRootType } from './lib';

const DEFAULT_INITIAL_DSL = {
  rootType: {
    type: 'object',
    properties: {},
  },
};

export class IndexMappings {
  constructor(initialDsl = DEFAULT_INITIAL_DSL) {
    this._dsl = cloneDeep(initialDsl);
    if (!isPlainObject(this._dsl)) {
      throw new TypeError('initial mapping must be an object');
    }

    // ensure that we have a properties object in the dsl
    // and that the dsl can be parsed with getRootProperties() and kin
    this._setProperties(getRootProperties(this._dsl) || {});
  }

  getDsl() {
    return cloneDeep(this._dsl);
  }

  addRootProperties(newProperties, options = {}) {
    const { plugin } = options;
    const rootProperties = getRootProperties(this._dsl);


    const conflicts = Object.keys(newProperties)
      .filter(key => rootProperties.hasOwnProperty(key));

    if (conflicts.length) {
      const props = formatListAsProse(conflicts);
      const owner = plugin ? `registered by plugin ${plugin} ` : '';
      throw new Error(
        `Mappings for ${props} ${owner}have already been defined`
      );
    }

    this._setProperties({
      ...rootProperties,
      ...newProperties
    });
  }

  _setProperties(newProperties) {
    const rootType = getRootType(this._dsl);
    this._dsl = {
      ...this._dsl,
      [rootType]: {
        ...this._dsl[rootType],
        properties: newProperties
      }
    };
  }
}
