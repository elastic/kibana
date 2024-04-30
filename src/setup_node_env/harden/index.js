/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

var ritm = require('require-in-the-middle');
var lodashPatch = require('./lodash_template');
var patchChildProcess = require('./child_process');

// the performance cost of using require-in-the-middle is atm directly related to the number of
// registered hooks (as require is patched once for EACH hook)
// This is why we are defining a single hook delegating for each of the patches we need to apply
new ritm.Hook(
  ['child_process', 'lodash', 'lodash/template', 'lodash/fp', 'lodash/fp/template'],
  function (module, name) {
    switch (name) {
      case 'child_process': {
        return patchChildProcess(module);
      }
      case 'lodash': {
        module.template = lodashPatch.createProxy(module.template);
        return module;
      }
      case 'lodash/template': {
        return lodashPatch.createProxy(module);
      }
      case 'lodash/fp': {
        module.template = lodashPatch.createFpProxy(module.template);
        return module;
      }
      case 'lodash/fp/template': {
        lodashPatch.createFpProxy(module);
        return module;
      }
    }
    return module;
  }
);
