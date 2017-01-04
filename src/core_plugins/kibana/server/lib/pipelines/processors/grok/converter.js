import { assign, forEach, set, isEmpty, keys } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'grok');
      assign(result.grok, {
        field: processorApiDocument.source_field,
        patterns: processorApiDocument.patterns
      });

      if (processorApiDocument.pattern_definitions.length > 0) {
        const definitions = {};
        forEach(processorApiDocument.pattern_definitions, (definition) => {
          if (definition.name && definition.value) {
            set(definitions, definition.name, definition.value);
          }
        });

        if (!isEmpty(definitions)) {
          assign(result.grok, {
            pattern_definitions: definitions
          });
        }
      }

      if (!isEmpty(processorApiDocument.trace_match)) {
        assign(result.grok, {
          trace_match: processorApiDocument.trace_match
        });
      }

      if (!isEmpty(processorApiDocument.ignore_missing)) {
        assign(result.grok, {
          ignore_missing: processorApiDocument.ignore_missing
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'grok');

      assign(result, {
        source_field: processorEsDocument.grok.field,
        patterns: processorEsDocument.grok.patterns
      });

      if (!isEmpty(processorEsDocument.grok.pattern_definitions)) {
        const esDefinitions = processorEsDocument.grok.pattern_definitions;
        const patternDefinitions = [];
        forEach(keys(esDefinitions), (key) => {
          patternDefinitions.push({ name: key, value: esDefinitions[key] });
        });

        assign(result, {
          pattern_definitions: patternDefinitions
        });
      }

      if (!isEmpty(processorEsDocument.grok.trace_match)) {
        assign(result, {
          trace_match: processorEsDocument.grok.trace_match
        });
      }

      if (!isEmpty(processorEsDocument.grok.ignore_missing)) {
        assign(result, {
          ignore_missing: processorEsDocument.grok.ignore_missing
        });
      }

      return result;
    }
  };
}
