// To avoid index template naming collisions the index pattern creation API
// namespaces template names by prepending 'kibana-' to the matching pattern's title.
// e.g. a pattern with title `logstash-*` will have a matching template named `kibana-logstash-*`.
// This module provides utility functions for easily converting between template and pattern names.

module.exports = {
  ingestToPattern: (templateName) => {
    if (templateName.indexOf('kibana-') === -1) {
      throw new Error('not a valid kibana namespaced template name');
    }

    return templateName.slice(templateName.indexOf('-') + 1);
  },

  patternToIngest: (patternName) => {
    if (patternName === '') {
      throw new Error('pattern must not be empty');
    }

    return `kibana-${patternName.toLowerCase()}`;
  }
};
