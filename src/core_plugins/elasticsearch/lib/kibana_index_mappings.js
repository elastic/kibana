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

  register = (newMappings) => {
    Object.keys(this._currentMappings).forEach(key => {
      if (newMappings.hasOwnProperty(key)) {
        this._plugin.status.red(`Mappings for ${key} have already been defined`);
      }
    });
    Object.assign(this._currentMappings, newMappings);
  }
}

export { KibanaMappings };
