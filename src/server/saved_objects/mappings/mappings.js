import { cloneDeep, isPlainObject } from 'lodash';

import { formatListAsProse } from '../../../utils';
import { getRootProperties, getRootType } from './lib';

const DEFAULT_INITIAL_DSL = {
  rootType: {
    type: 'object',
    properties: {},
  },
};

/**
 *  Mappings objects wrap a mapping DSL and gives it methods for
 *  modification and formatting
 *  @class Mappings
 */
export class Mappings {
  /**
   *  Create a Mappings object starting with a DSL
   *  @constructor
   *  @param  {Object} [initialDsl=DEFAULT_INITIAL_DSL]
   */
  constructor(initialDsl = DEFAULT_INITIAL_DSL) {
    this._dsl = cloneDeep(initialDsl);
    if (!isPlainObject(this._dsl)) {
      throw new TypeError('initial mapping must be an object');
    }

    // ensure that we have a properties object in the dsl
    // and that the dsl can be parsed with getRootProperties() and kin
    this._setProperties(this.getRootProperties());
  }

  /**
   *  Get the elasticsearch DSL representation of the Mappings in its
   *  current state.
   *  @return {mappingDSL}
   */
  getDsl() {
    return cloneDeep(this._dsl);
  }

  /**
   *  Get the name of the type at the root of the mapping.
   *  @return {string}
   */
  getRootType() {
    return getRootType(this._dsl);
  }

  /**
   *  Get the property mappings for the root type. This same value
   *  can be found at `{indexName}.mappings.{typeName}.properties`
   *  in the es indices.get() response.
   *  @return {EsPropertyMappings}
   */
  getRootProperties() {
    return getRootProperties(this._dsl);
  }

  /**
   *  Add some properties to the root type in the mapping. Since indices can
   *  only have one type this is how we simulate "types" in a single index
   *  @param {Object<name,mappingDSL>} newProperties
   *  @param {Object} [options={}]
   *  @property {string} options.plugin the plugin id that is adding this
   *                                    root property, used for error message
   *                                    if the property conflicts with existing
   *                                    properties
   */
  addRootProperties(newProperties, options = {}) {
    const { plugin } = options;
    const rootProperties = this.getRootProperties();


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
