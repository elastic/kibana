module.exports = function (kibana) {

  return new kibana.Plugin({
    ui: {
      visTypes: [
        'table_vis.js'
      ]
    }
  });

};
