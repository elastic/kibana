import uuid from 'uuid/v4';

export default () => {
  return {
    app: {}, // Kibana stuff in here
    transient: { // Things that don't survive a refresh
      fullscreen: false,
      editor: true,
      selectedElement: null,
      // dropdown type
      dropdown: null,
      // Element arguments are cached up here.
      elementCache: {},
      // Dataframes get written here on resolution
      dataframeCache: {},
      // Workpads cached from the server
      workpads: [],
      // Dataframe settings
      dataframeSelectedId: null,
      dataframeIsCreating: false,
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
      filters: {},
      dataframes: {
        'dataframe-1': {
          id: 'dataframe-1',
          name: 'Cars',
          type: 'csv',
          value: {
            csv:'"make","model","year","price"\n' +
                '"Subaru","Impreza","2015",17695\n' +
                '"Subaru","Impreza","2016",18020\n' +
                '"Subaru","Impreza","2017",18245\n' +
                '"Subaru","Baja","2015",21995\n' +
                '"Subaru","Baja","2016",21995\n' +
                '"Subaru","Baja","2017",22345\n' +
                '"Subaru","Outback","2015",23245\n' +
                '"Subaru","Outback","2016",23470\n' +
                '"Subaru","Outback","2017",24445\n'
          }
        }
      }
    },
  };
};
