module.exports = function (kibana) {

  return new kibana.Plugin({
    ui: {
      visType: './table_vis.js'
    }
  });

};
