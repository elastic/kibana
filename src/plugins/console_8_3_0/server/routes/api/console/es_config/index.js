"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerEsConfigRoute = void 0;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const registerEsConfigRoute = ({
  router,
  services
}) => {
  router.get({
    path: '/api/console/es_config',
    validate: false
  }, async (ctx, req, res) => {
    const {
      hosts: [host]
    } = await services.esLegacyConfigService.readConfig();
    const body = {
      host
    };
    return res.ok({
      body
    });
  });
};

exports.registerEsConfigRoute = registerEsConfigRoute;