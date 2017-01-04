import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'date');
      assign(result.date, {
        field: processorApiDocument.source_field,
        formats: processorApiDocument.formats
      });

      if (!isEmpty(processorApiDocument.target_field)) {
        assign(result.date, {
          target_field: processorApiDocument.target_field
        });
      }

      if (!isEmpty(processorApiDocument.timezone)) {
        assign(result.date, {
          timezone: processorApiDocument.timezone
        });
      }

      if (!isEmpty(processorApiDocument.locale)) {
        assign(result.date, {
          locale: processorApiDocument.locale
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'date');

      assign(result, {
        source_field: processorEsDocument.date.field,
        formats: processorEsDocument.date.formats
      });

      if (!isEmpty(processorEsDocument.date.target_field)) {
        assign(result, {
          target_field: processorEsDocument.date.target_field
        });
      }

      if (!isEmpty(processorEsDocument.date.timezone)) {
        assign(result, {
          timezone: processorEsDocument.date.timezone
        });
      }

      if (!isEmpty(processorEsDocument.date.locale)) {
        assign(result, {
          locale: processorEsDocument.date.locale
        });
      }

      return result;
    }
  };
}
