/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import sinon from 'sinon';

function MockState(defaults) {
  this.on = _.noop;
  this.off = _.noop;
  this.save = sinon.stub();
  this.replace = sinon.stub();
  _.assign(this, defaults);
}

export default MockState;
