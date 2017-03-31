const currentMappings = {
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

export function assignMappings(newMappings) {
  Object.keys(currentMappings).forEach(function (key) {
    if (newMappings.hasOwnProperty(key)) throw new Error(`Mappings for ${key} have already been defined`);
  });
  Object.assign(currentMappings, newMappings);
}

export function getMappings() {
  return currentMappings;
}
