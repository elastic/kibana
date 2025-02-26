/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable import/no-duplicates, no-restricted-imports, no-restricted-properties, no-restricted-modules */

import * as a from 'lodash';
import * as b from 'lodash/fp';

import { set as c } from 'lodash';
import { setWith as d } from 'lodash';
import { template as e } from 'lodash';

// The following import statements can't be tested because they are not in our package.json
// import 'lodash.set';
// import 'lodash.setWith';
// import 'lodash.template';

import 'lodash/set';
import 'lodash/setWith';
import 'lodash/template';

import { set as f } from 'lodash/fp';
import { setWith as g } from 'lodash/fp';
import { assoc as h } from 'lodash/fp';
import { assocPath as i } from 'lodash/fp';
import { template as j } from 'lodash/fp';

import 'lodash/fp/set';
import 'lodash/fp/setWith';
import 'lodash/fp/assoc';
import 'lodash/fp/assocPath';
import 'lodash/fp/template';

// The following require statements can't be tested because they are not in our package.json
// require('lodash.set');
// require('lodash.setWith');
// require('lodash.template');

require('lodash/set');
require('lodash/setWith');
require('lodash/template');

require('lodash/fp/set');
require('lodash/fp/setWith');
require('lodash/fp/assoc');
require('lodash/fp/assocPath');
require('lodash/fp/template');

const lodash = {
  set() {},
  setWith() {},
  assoc() {},
  assocPath() {},
  template() {},
};
lodash.set();
lodash.setWith();
lodash.assoc();
lodash.assocPath();
lodash.template();

const _ = lodash;
_.set();
_.setWith();
_.assoc();
_.assocPath();
_.template();

// hack to ensure all imported variables are used
module.exports = [a, b, c, d, e, f, g, h, i, j];
