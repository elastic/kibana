/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Writer } from 'mustache';
import { getServices } from '../../../kibana_services';

const TEMPLATE_TAGS = ['{', '}'];

// Can not use 'Mustache' since its a global object
const mustacheWriter = new Writer();
// do not html escape output
mustacheWriter.escapedValue = function escapedValue(token, context) {
  const value = context.lookup(token[1]);
  if (value != null) {
    return value;
  }
};

export function replaceTemplateStrings(text, params = {}) {
  const { tutorialVariables, metadata, docLinks } = getServices();

  const variables = {
    // '{' and '}' can not be used in template since they are used as template tags.
    // Must use '{curlyOpen}'' and '{curlyClose}'
    curlyOpen: '{',
    curlyClose: '}',
    config: {
      ...tutorialVariables(),
      docs: {
        base_url: docLinks.ELASTIC_WEBSITE_URL,
        beats: {
          filebeat: docLinks.links.filebeat.base,
          metricbeat: docLinks.links.metricbeat.base,
          heartbeat: docLinks.links.heartbeat.base,
          functionbeat: docLinks.links.functionbeat.base,
          winlogbeat: docLinks.links.winlogbeat.base,
          auditbeat: docLinks.links.auditbeat.base,
        },
        logstash: docLinks.links.logstash.base,
        version: docLinks.DOC_LINK_VERSION,
      },
      kibana: {
        version: metadata.version,
      },
    },
    params: params,
  };
  mustacheWriter.parse(text, TEMPLATE_TAGS);
  return mustacheWriter.render(text, variables);
}
