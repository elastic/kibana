export const mappings = {
  config: {
    properties: {
      buildNum: {
        type: 'string',
        index: 'not_analyzed'
      }
    }
  },
  uuids: {
    properties: {
      uuid: {
        type: 'string',
        index: 'not_analyzed'
      }
    }
  }
};
