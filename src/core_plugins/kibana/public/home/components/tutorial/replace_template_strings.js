import Mustache from 'mustache';
import { metadata } from 'ui/metadata';

const TEMPLATE_TAGS = ['{', '}'];

export function replaceTemplateStrings(text) {
  const variables = {
    config: {
      kibana: {
        version: metadata.version
      }
    }
  };
  Mustache.parse(text, TEMPLATE_TAGS);
  return Mustache.render(text, variables);
}
