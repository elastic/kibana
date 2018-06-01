/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

require('ace');

const module = require('ui/modules').get('app/sense');

// mock the resize checker
module.run(function () {
  module.setupResizeCheckerForRootEditors = () => {};
});

require('ui/chrome')
  .setRootTemplate(require('./index.html'))
  .setRootController(function () {
    window.QUnit = require('qunit-1.10.0');

    require('qunit-1.10.0.css');
    require('ace');
    /* global QUnit */
    QUnit.config.autostart = false;
    QUnit.init();

    require('./src/content_type.js');
    require('./src/utils_tests.js');
    require('./src/url_autocomplete_tests.js');
    require('./src/url_params_tests.js');
    require('./src/curl_parsing_tests.js');
    require('./src/kb_tests.js');
    require('./src/mapping_tests.js');
    require('./src/editor_tests.js');
    require('./src/input_tokenization_tests.js');
    require('./src/output_tokenization_tests.js');
    require('./src/integration_tests.js');

    console.log('all tests loaded');
    QUnit.start();
  });
