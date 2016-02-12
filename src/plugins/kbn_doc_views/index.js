module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      docViews: [
        'kbn_doc_views.js'
      ]
    }

  });

};
