import uuid from 'uuid/v4';

export default () => {
  return {
    app: {}, // Kibana stuff in here
    transient: { // Things that don't survive a refresh
      fullscreen: false,
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
        width: 600,
        height: 720,
        page: 0,
        time: { // persist time with workpad, this is easy to change
          from: 'now-1y',
          to: 'now',
          mode: 'relative',
        }
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
            csv:'"make","model","year","price"\n' +
                '"Subaru","Impreza",2003,17695\n' +
                '"Subaru","Impreza",2004,18020\n' +
                '"Subaru","Impreza",2005,18245\n' +
                '"Subaru","Baja",2003,21995\n' +
                '"Subaru","Baja",2004,21995\n' +
                '"Subaru","Baja",2005,22345\n' +
                '"Subaru","Outback",2003,23245\n' +
                '"Subaru","Outback",2004,23470\n' +
                '"Subaru","Outback",2005,24445\n'
          }
        },
        /*
        'dataframe-0': {
          id: 'dataframe-0',
          name: 'Static',
          type: 'timelion',
          value: {
            expression: '.static(5:10:2:10:23:11:12:13:14)',
            interval: 'auto'
          }
        }
        */
      }
    },
  };
};
