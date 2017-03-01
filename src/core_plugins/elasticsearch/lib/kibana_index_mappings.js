const defaultMappings = {
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

export function assignMappings(mappings) {
  Object.assign(defaultMappings, mappings);
}

export function getMappings() {
  return defaultMappings;
}
