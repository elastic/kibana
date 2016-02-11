module.exports = function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      docViews: [
        'kbn_doc_views.js'
      ]
    }

  });

};
