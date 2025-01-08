/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as a from 'lodash'; // eslint-disable-line no-restricted-imports
import * as b from 'lodash/fp'; // eslint-disable-line no-restricted-imports

import { set as c } from 'lodash'; // eslint-disable-line no-restricted-imports
import { setWith as d } from 'lodash'; // eslint-disable-line no-restricted-imports
import { template as e } from 'lodash'; // eslint-disable-line no-restricted-imports

// The following import statements can't be tested because they are not in our package.json
// import 'lodash.set'; // eslint-disable-line no-restricted-imports
// import 'lodash.setWith'; // eslint-disable-line no-restricted-imports
// import 'lodash.template'; // eslint-disable-line no-restricted-imports

import 'lodash/set'; // eslint-disable-line no-restricted-imports
import 'lodash/setWith'; // eslint-disable-line no-restricted-imports
import 'lodash/template'; // eslint-disable-line no-restricted-imports

import { set as f } from 'lodash/fp'; // eslint-disable-line no-restricted-imports
import { setWith as g } from 'lodash/fp'; // eslint-disable-line no-restricted-imports
import { assoc as h } from 'lodash/fp'; // eslint-disable-line no-restricted-imports
import { assocPath as i } from 'lodash/fp'; // eslint-disable-line no-restricted-imports
import { template as j } from 'lodash/fp'; // eslint-disable-line no-restricted-imports

import 'lodash/fp/set'; // eslint-disable-line no-restricted-imports
import 'lodash/fp/setWith'; // eslint-disable-line no-restricted-imports
import 'lodash/fp/assoc'; // eslint-disable-line no-restricted-imports
import 'lodash/fp/assocPath'; // eslint-disable-line no-restricted-imports
import 'lodash/fp/template'; // eslint-disable-line no-restricted-imports

// The following require statements can't be tested because they are not in our package.json
// require('lodash.set'); // eslint-disable-line no-restricted-modules
// require('lodash.setWith'); // eslint-disable-line no-restricted-modules
// require('lodash.template'); // eslint-disable-line no-restricted-modules

require('lodash/set'); // eslint-disable-line no-restricted-modules
require('lodash/setWith'); // eslint-disable-line no-restricted-modules
require('lodash/template'); // eslint-disable-line no-restricted-modules

require('lodash/fp/set'); // eslint-disable-line no-restricted-modules
require('lodash/fp/setWith'); // eslint-disable-line no-restricted-modules
require('lodash/fp/assoc'); // eslint-disable-line no-restricted-modules
require('lodash/fp/assocPath'); // eslint-disable-line no-restricted-modules
require('lodash/fp/template'); // eslint-disable-line no-restricted-modules

const lodash = {
  set() {},
  setWith() {},
  assoc() {},
  assocPath() {},
  template() {},
};
lodash.set(); // eslint-disable-line no-restricted-properties
lodash.setWith(); // eslint-disable-line no-restricted-properties
lodash.assoc(); // eslint-disable-line no-restricted-properties
lodash.assocPath(); // eslint-disable-line no-restricted-properties
lodash.template(); // eslint-disable-line no-restricted-properties

const _ = lodash;
_.set(); // eslint-disable-line no-restricted-properties
_.setWith(); // eslint-disable-line no-restricted-properties
_.assoc(); // eslint-disable-line no-restricted-properties
_.assocPath(); // eslint-disable-line no-restricted-properties
_.template(); // eslint-disable-line no-restricted-properties

// hack to ensure all imported variables are used
module.exports = [a, b, c, d, e, f, g, h, i, j];
