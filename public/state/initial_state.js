export default {
  app: {}, // Kibana stuff in here
  transient: {
    editor: false,
    page: 0
  }, // Things that don't survive a refresh
  persistent: { // Stuff that should survive, and be serialized and saved
    workpad: {
      pages: []
    },
    dataframes: {}
  },
};
