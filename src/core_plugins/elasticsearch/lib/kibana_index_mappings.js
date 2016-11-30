export const mappings = {
  config: {
    properties: {
      buildNum: {
        type: 'keyword',
        index: true
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
