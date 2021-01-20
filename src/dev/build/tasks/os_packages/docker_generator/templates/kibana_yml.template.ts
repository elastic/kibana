/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import dedent from 'dedent';

import { TemplateContext } from '../template_context';

function generator({ imageFlavor }: TemplateContext) {
  return dedent(`
  #
  # ** THIS IS AN AUTO-GENERATED FILE **
  #

  # Default Kibana configuration for docker target
  server.name: kibana
  server.host: "0.0.0.0"
  elasticsearch.hosts: [ "http://elasticsearch:9200" ]
  ${!imageFlavor ? 'monitoring.ui.container.elasticsearch.enabled: true' : ''}
  `);
}

export const kibanaYMLTemplate = {
  name: 'config/kibana.yml',
  generator,
};
