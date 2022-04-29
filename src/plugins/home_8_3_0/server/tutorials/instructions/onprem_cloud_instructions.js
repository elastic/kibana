"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createTrycloudOption2 = exports.createTrycloudOption1 = void 0;

var _i18n = require("@kbn/i18n");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const createTrycloudOption1 = () => ({
  title: _i18n.i18n.translate('home.tutorials.common.premCloudInstructions.option1.title', {
    defaultMessage: 'Option 1: Try in Elastic Cloud'
  }),
  textPre: _i18n.i18n.translate('home.tutorials.common.premCloudInstructions.option1.textPre', {
    defaultMessage: 'Go to [Elastic Cloud]({link}). Register if you \
do not already have an account. Free 14-day trial available.\n\n\
Log into the Elastic Cloud console\n\n\
To create a cluster, in Elastic Cloud console:\n\
 1. Select **Create Deployment** and specify the **Deployment Name**\n\
 2. Modify the other deployment options as needed (or not, the defaults are great to get started)\n\
 3. Click **Create Deployment**\n\
 4. Wait until deployment creation completes\n\
 5. Go to the new Cloud Kibana instance and follow the Kibana Home instructions',
    values: {
      link: 'https://www.elastic.co/cloud/as-a-service/signup?blade=kib'
    }
  })
});

exports.createTrycloudOption1 = createTrycloudOption1;

const createTrycloudOption2 = () => ({
  title: _i18n.i18n.translate('home.tutorials.common.premCloudInstructions.option2.title', {
    defaultMessage: 'Option 2: Connect local Kibana to a Cloud instance'
  }),
  textPre: _i18n.i18n.translate('home.tutorials.common.premCloudInstructions.option2.textPre', {
    defaultMessage: 'If you are running this Kibana instance against a hosted Elasticsearch instance, \
proceed with manual setup.\n\n\
Save the **Elasticsearch** endpoint as {urlTemplate} and the cluster **Password** as {passwordTemplate} for your records',
    values: {
      urlTemplate: '`<es_url>`',
      passwordTemplate: '`<password>`'
    }
  })
});

exports.createTrycloudOption2 = createTrycloudOption2;