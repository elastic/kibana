module.exports = function (kibana) {

  return new kibana.Plugin({
    exports: {
      app: {
        title: 'Kibana',
        description: 'the kibana you know and love',
        icon: 'plugins/kibana/settings/sections/about/barcode.svg',
        main: 'plugins/kibana/index',
        uses: [
          'visTypes',
          'spyModes'
        ]
      }
    }
  });

};
