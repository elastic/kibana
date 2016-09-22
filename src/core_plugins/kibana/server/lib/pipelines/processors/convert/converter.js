import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const types = {
        //<kibana type>: <ingest type>,
        auto: 'auto',
        number: 'float',
        string: 'string',
        boolean: 'boolean'
      };

      const result = baseConverter.kibanaToEs(processorApiDocument, 'convert');
      assign(result.convert, {
        field: processorApiDocument.source_field,
        type: types[processorApiDocument.type]
      });

      if (!isEmpty(processorApiDocument.target_field)) {
        assign(result.convert, {
          target_field: processorApiDocument.target_field
        });
      }

      if (!isEmpty(processorApiDocument.ignore_missing)) {
        assign(result.convert, {
          ignore_missing: processorApiDocument.ignore_missing
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'convert');

      const types = {
        //<ingest type>: <kibana type>
        auto: 'auto',
        double: 'number',
        float: 'number',
        integer: 'number',
        long: 'number',
        short: 'number',
        string: 'string',
        boolean: 'boolean'
      };

      assign(result, {
        source_field: processorEsDocument.convert.field,
        type: types[processorEsDocument.convert.type]
      });

      if (!isEmpty(processorEsDocument.convert.target_field)) {
        assign(result, {
          target_field: processorEsDocument.convert.target_field
        });
      }

      if (!isEmpty(processorEsDocument.convert.ignore_missing)) {
        assign(result, {
          ignore_missing: processorEsDocument.convert.ignore_missing
        });
      }

      return result;
    }
  };
}
