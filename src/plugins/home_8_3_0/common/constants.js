"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TutorialsCategory = exports.PLUGIN_ID = exports.HOME_APP_BASE_PATH = void 0;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const PLUGIN_ID = 'home';
exports.PLUGIN_ID = PLUGIN_ID;
const HOME_APP_BASE_PATH = `/app/${PLUGIN_ID}`;
exports.HOME_APP_BASE_PATH = HOME_APP_BASE_PATH;
let TutorialsCategory;
exports.TutorialsCategory = TutorialsCategory;

(function (TutorialsCategory) {
  TutorialsCategory["LOGGING"] = "logging";
  TutorialsCategory["SECURITY_SOLUTION"] = "security";
  TutorialsCategory["METRICS"] = "metrics";
  TutorialsCategory["OTHER"] = "other";
})(TutorialsCategory || (exports.TutorialsCategory = TutorialsCategory = {}));