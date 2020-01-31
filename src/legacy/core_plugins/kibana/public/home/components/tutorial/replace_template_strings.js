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
import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';
import {
  DOC_LINK_VERSION,
  ELASTIC_WEBSITE_URL,
  documentationLinks,
} from 'ui/documentation_links/documentation_links';

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
  const variables = {
    // '{' and '}' can not be used in template since they are used as template tags.
    // Must use '{curlyOpen}'' and '{curlyClose}'
    curlyOpen: '{',
    curlyClose: '}',
    config: {
      cloud: {
        id: chrome.getInjected('cloudId'),
      },
      docs: {
        base_url: ELASTIC_WEBSITE_URL,
        beats: {
          filebeat: documentationLinks.filebeat.base,
          metricbeat: documentationLinks.metricbeat.base,
          heartbeat: documentationLinks.heartbeat.base,
          functionbeat: documentationLinks.functionbeat.base,
          winlogbeat: documentationLinks.winlogbeat.base,
          auditbeat: documentationLinks.auditbeat.base,
        },
        logstash: documentationLinks.logstash.base,
        version: DOC_LINK_VERSION,
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
