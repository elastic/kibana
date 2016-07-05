require('ace');

require('ui/chrome')
  .setTabs([{
    id: '',
    title: 'Sense Tests'
  }])
  .setRootTemplate(require('./index.html'))
  .setRootController(function () {
    window.QUnit = require('qunit-1.10.0');

    require('qunit-1.10.0.css');
    require('ace');
    /* global QUnit */
    QUnit.config.autostart = false;
    QUnit.init();

    require('./src/url_autocomplete_tests.js');
    require('./src/url_params_tests.js');
    require('./src/curl_parsing_tests.js');
    require('./src/kb_tests.js');
    require('./src/mapping_tests.js');
    require('./src/editor_tests.js');
    require('./src/tokenization_tests.js');
    require('./src/integration_tests.js');

    console.log('all tests loaded');
    QUnit.start();
  });
