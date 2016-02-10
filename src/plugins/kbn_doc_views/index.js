module.exports = function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      docViews: [
        'plugins/kbn_doc_views/kbn_doc_views'
      ]
    }

  });

};
