export default {
  app: {}, // Kibana stuff in here
  transient: {
    editor: false,
  }, // Things that don't survive a refresh
  persistent: { // Stuff that should survive, and be serialized and saved
    workpad: {
      id: 'workpad-485723-3425-2345324',
      pages: ['page-0', 'page-1'], // In theory you could reference a page multiple times, but you know, don't.
      height: 600,
      width: 400,
      page: 0,
    },
    pages: {
      'page-0': {
        id: 'page-0',
        style: {
          backgroundColor: '#c66'
        },
        elements: ['element-0', 'element-2'] // Same deal here. I'm watching you.
      },
      'page-1': {
        id: 'page-1',
        style: {
          backgroundColor: '#6c6'
        },
        elements: ['element-1']
      }
    },
    elements: {
      'element-0': {
        id: 'element-0',
        type: 'json',
        height: 100,
        width: 100,
        top: 0,
        left: 0,
        angle: 0,
        props: {}
      },
      'element-2': {
        id: 'element-2',
        type: 'table',
        height: 100,
        width: 100,
        top: 300,
        left: 300,
        angle: 30,
        props: {}
      },
      'element-1': {
        id: 'element-1',
        type: 'table',
        height: 100,
        width: 100,
        top: 300,
        left: 50,
        angle: 270,
        props: {}
      }
    },
    dataframes: {}
  },
};
