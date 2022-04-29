"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerRoutes = void 0;

var _fetch_es_hits_status = require("./fetch_es_hits_status");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const registerRoutes = router => {
  (0, _fetch_es_hits_status.registerHitsStatusRoute)(router);
};

exports.registerRoutes = registerRoutes;