import { cloneDeep } from 'lodash';

class MappingsCollection {
  constructor(rootType = 'rootType', rootProperties = {}) {
    this._rootType = rootType;
    this._rootProperties = cloneDeep(rootProperties);
  }

  getCombined() {
    return {
      [this._rootType]: {
        dynamic: false,
        properties: this._rootProperties,
      },
    };
  }

  register(newProperties, options = {}) {
    const { plugin } = options;

    const pluginPartial = plugin
      ? `registered by plugin ${plugin} `
      : '';

    Object.keys(newProperties).forEach(key => {
      if (this._rootProperties.hasOwnProperty(key)) {
        throw new Error(
          `Mappings for ${key} ${pluginPartial}have already been defined`
        );
      }
    });

    this._rootProperties = {
      ...this._rootProperties,
      ...newProperties
    };
  }
}

export { MappingsCollection };
