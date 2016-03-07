module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      docViews: [
        './views/table.js',
        './views/json.js'
      ]
    }

  });

};
