import uuid from 'uuid/v4';

export default {
  app: {}, // Kibana stuff in here
  transient: { // Things that don't survive a refresh
    editor: true,
    selectedElement: null,
    dropdown: null,
    // Element arguments are cached up here.
    elementCache: {},
    // Dataframes get written here on resolution
    dataframeCache: {},
  },
  persistent: { // Stuff that should survive, be serialized and be saved
    workpad: {
      name: 'Untitled Workpad',
      id: uuid(),
      pages: ['page-0'], // In theory you could reference a page multiple times, but you know, don't.
      height: 800,
      width: 600,
      page: 0,
    },
    pages: {
      'page-0': {
        id: 'page-0',
        style: {
          backgroundColor: '#fff'
        },
        elements: [] // Same deal here. I'm watching you.
      },
    },
    elements: {},
    dataframes: {
      'dataframe-1': {
        id: 'dataframe-1',
        name: 'Cars',
        type: 'csv',
        value: {
          csv:'"model","segment","price"\n' +
              '"crosstrek","SUV",21000\n' +
              '"impreza","sedan",16000\n' +
              '"outback","SUV",25000\n'
        }
      },
      'dataframe-0': {
        id: 'dataframe-0',
        name: 'Static',
        type: 'timelion',
        value: {
          expression: '.static(5:10:2:10:23:11:12:13:14)',
          interval: 'auto'
        }
      }
    }
  },
};
