export const mappings = {
  '_default_': {
    'dynamic': 'false'
  },
  config: {
    properties: {
      buildNum: {
        type: 'keyword'
      }
    }
  },
  server: {
    properties: {
      uuid: {
        type: 'keyword'
      }
    }
  }
};
