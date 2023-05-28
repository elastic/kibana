/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { require } from './require';
import './stdout';
import './ws';

import { initCapture } from './capture';
import { setCurrentsVersion, setCypressVersion } from './httpClient';
// const cypressPkg = require('cypress/package.json');
// const pkg = require('cypress-cloud/package.json');

initCapture();
setCypressVersion('12.10.0');
setCurrentsVersion('1.7.4');
