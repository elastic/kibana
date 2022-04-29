"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cloudPasswordAndResetLink = void 0;

var _i18n = require("@kbn/i18n");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const cloudPasswordAndResetLink = _i18n.i18n.translate('home.tutorials.common.cloudInstructions.passwordAndResetLink', {
  defaultMessage: 'Where {passwordTemplate} is the password of the `elastic` user.' + `\\{#config.cloud.profileUrl\\}
      Forgot the password? [Reset in Elastic Cloud](\\{config.cloud.baseUrl\\}\\{config.cloud.deploymentUrl\\}/security).
      \\{/config.cloud.profileUrl\\}`,
  values: {
    passwordTemplate: '`<password>`'
  }
});

exports.cloudPasswordAndResetLink = cloudPasswordAndResetLink;