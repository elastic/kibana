export default {
  app: {}, // Kibana stuff in here
  transient: {
    editor: false,
  }, // Things that don't survive a refresh
  persistent: { // Stuff that should survive, and be serialized and saved
    workpad: {
      pages: [
        {
          id: 'foo',
          type: 'json',
          props: {
            _style: {
              backgroundColor: '#c66'
            }
          }
        },
        {
          id: 'bar',
          type: 'json',
          props: {
            _style: {
              backgroundColor: '#6c6'
            }
          }
        }
      ],
      height: 600,
      width: 400,
      page: 0,
    },
    dataframes: {}
  },
};
