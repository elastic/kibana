/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Mustache, { type RenderOptions } from 'mustache';
import { getServices } from '../../kibana_services';

const TEMPLATE_TAGS: [string, string] = ['{', '}'];
interface TemplateContext {
  curlyOpen: '{';
  curlyClose: '}';
  config: {
    docs: {
      base_url: string;
      beats: {
        filebeat: string;
        metricbeat: string;
        heartbeat: string;
        winlogbeat: string;
        auditbeat: string;
      };
      logstash: string;
      version: string;
    };
    kibana: {
      version: string;
    };
  };
}

// replace template strings without the default mustache escaping
export function replaceTemplateStrings(text: string) {
  const { tutorialService, kibanaVersion, docLinks } = getServices();
  const variables: TemplateContext = {
    // '{' and '}' can not be used in template since they are used as template tags.
    // Must use '{curlyOpen}'' and '{curlyClose}'
    curlyOpen: '{',
    curlyClose: '}',
    config: {
      ...tutorialService.getVariables(),
      docs: {
        base_url: docLinks.ELASTIC_WEBSITE_URL,
        beats: {
          filebeat: docLinks.links.filebeat.base,
          metricbeat: docLinks.links.metricbeat.base,
          heartbeat: docLinks.links.heartbeat.base,
          winlogbeat: docLinks.links.winlogbeat.base,
          auditbeat: docLinks.links.auditbeat.base,
        },
        logstash: docLinks.links.logstash.base,
        version: docLinks.DOC_LINK_VERSION,
      },
      kibana: {
        version: kibanaVersion,
      },
    },
  };
  const config: RenderOptions = {
    tags: TEMPLATE_TAGS,
    escape: (s: string) => s,
  };
  return Mustache.render(text, variables, undefined, config);
}
