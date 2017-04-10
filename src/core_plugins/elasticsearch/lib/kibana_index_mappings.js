import _ from 'lodash';

class KibanaMappings {
  constructor(plugin) {
    this._plugin = plugin;
    this._defaultMappings = {
      '_default_': {
        'dynamic': 'strict'
      },
      config: {
        dynamic: true,
        properties: {
          buildNum: {
            type: 'keyword'
          }
        }
      },
    };
    this._currentMappings = _.cloneDeep(this._defaultMappings);
  }

  getCombined = () => {
    return this._currentMappings;
  }

  register = (newMappings, options = {}) => {
    Object.keys(this._currentMappings).forEach(key => {
      if (newMappings.hasOwnProperty(key)) {
        const pluginPartial = options.plugin ? `registered by plugin ${options.plugin} ` : '';
        this._plugin.status.red(`Mappings for ${key} ${pluginPartial}have already been defined`);
        return;
      }
    });
    Object.assign(this._currentMappings, newMappings);
  }
}

export { KibanaMappings };
