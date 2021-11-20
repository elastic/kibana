/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

module.exports = {
  licenseHeader: `
  /*
   * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
   * or more contributor license agreements. Licensed under the Elastic License
   * 2.0 and the Server Side Public License, v 1; you may not use this file except
   * in compliance with, at your election, the Elastic License 2.0 or the Server
   * Side Public License, v 1.
   */
`,
  supportedContexts: [
    'boolean_script_field_script_field',
    'date_script_field',
    'double_script_field_script_field',
    'filter',
    'ip_script_field_script_field',
    'long_script_field_script_field',
    'common',
    'processor_conditional',
    'score',
    'string_script_field_script_field',
  ],
};
