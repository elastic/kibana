import { Writer } from 'mustache';
import chrome from 'ui/chrome';
import { metadata } from 'ui/metadata';
import {
  DOC_LINK_VERSION,
  ELASTIC_WEBSITE_URL,
  documentationLinks
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
        id: chrome.getInjected('cloudId')
      },
      docs: {
        base_url: ELASTIC_WEBSITE_URL,
        beats: {
          filebeat: documentationLinks.filebeat.base,
          metricbeat: documentationLinks.metricbeat.base
        },
        logstash: documentationLinks.logstash.base,
        version: DOC_LINK_VERSION
      },
      kibana: {
        version: metadata.version
      }
    },
    params: params
  };
  mustacheWriter.parse(text, TEMPLATE_TAGS);
  return mustacheWriter.render(text, variables);
}
