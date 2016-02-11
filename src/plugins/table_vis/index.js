module.exports = function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'table_vis.js'
      ]
    }
  });

};
