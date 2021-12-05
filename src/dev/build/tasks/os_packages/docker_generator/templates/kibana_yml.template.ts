/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';

import { TemplateContext } from '../template_context';

// IMPORTANT: Please notify @elastic/kibana-security if you're changing any of the Docker specific
// configuration defaults. We rely on these defaults in the interactive setup mode.
function generator({ imageFlavor }: TemplateContext) {
  return dedent(`
  #
  # ** THIS IS AN AUTO-GENERATED FILE **
  #

  # Default Kibana configuration for docker target
  server.host: "0.0.0.0"
  server.shutdownTimeout: "5s"
  elasticsearch.hosts: [ "http://elasticsearch:9200" ]
  monitoring.ui.container.elasticsearch.enabled: true
  `);
}

export const kibanaYMLTemplate = {
  name: 'config/kibana.yml',
  generator,
};
