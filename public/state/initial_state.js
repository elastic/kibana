export default {
  app: {}, // Kibana stuff in here
  transient: {
    editor: false,
    resolvedArgs: {} // This needs to be populated at startup
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
        args: {
          _style: 'border: 1px solid #000;'
        }
      },
      'element-2': {
        id: 'element-2',
        type: 'box',
        height: 100,
        width: 200,
        top: 300,
        left: 100,
        angle: 30,
        args: {
          color: '#BEEB9F'
        }
      },
      'element-1': {
        id: 'element-1',
        type: 'box',
        height: 70,
        width: 300,
        top: 300,
        left: 50,
        angle: 270,
        args: {
          color: '#00A388'
        }
      }
    },
    storage: {
      dataframes: {
        'dataframe-43524-3246-363': {
          type: 'CSV',
          value: `"model","segment","price"
                  "crosstrek","SUV",21000
                  "impreza","sedan",16000
                  "outback","SUV",25000`
        }
      }
    }
  },
};
