/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
  Global import, so we don't need to remember to import the lib in each file
  https://www.npmjs.com/package/jest-styled-components#global-installation
*/

import 'jest-styled-components';
import '@testing-library/jest-dom';

// uses subpath exports
// eslint-disable-next-line @kbn/imports/no_unresolvable_imports
import 'web-streams-polyfill/polyfill'; // ReadableStream polyfill

/**
 * Removed in Jest 27/jsdom, used in some transitive dependencies
 */
global.setImmediate = require('core-js/stable/set-immediate');
global.clearImmediate = require('core-js/stable/clear-immediate');
