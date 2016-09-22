import { assign, compact, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'date_index_name');
      assign(result.date_index_name, {
        field: processorApiDocument.source_field,
        date_rounding: processorApiDocument.date_rounding
      });

      const formats = compact(processorApiDocument.date_formats);
      if (!isEmpty(formats)) {
        assign(result.date_index_name, {
          date_formats: processorApiDocument.formats
        });
      }

      if (!isEmpty(processorApiDocument.index_name_prefix)) {
        assign(result.date_index_name, {
          index_name_prefix: processorApiDocument.index_name_prefix
        });
      }

      if (!isEmpty(processorApiDocument.timezone)) {
        assign(result.date_index_name, {
          timezone: processorApiDocument.timezone
        });
      }

      if (!isEmpty(processorApiDocument.locale)) {
        assign(result.date_index_name, {
          locale: processorApiDocument.locale
        });
      }

      if (!isEmpty(processorApiDocument.index_name_format)) {
        assign(result.date_index_name, {
          index_name_format: processorApiDocument.index_name_format
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'date_index_name');

      assign(result, {
        source_field: processorEsDocument.date_index_name.field,
        date_rounding: processorEsDocument.date_index_name.date_rounding
      });

      if (!isEmpty(processorEsDocument.date_index_name.date_formats)) {
        assign(result, {
          date_formats: processorEsDocument.date_index_name.date_formats
        });
      }

      if (!isEmpty(processorEsDocument.date_index_name.index_name_prefix)) {
        assign(result, {
          index_name_prefix: processorEsDocument.date_index_name.index_name_prefix
        });
      }

      if (!isEmpty(processorEsDocument.date_index_name.timezone)) {
        assign(result, {
          timezone: processorEsDocument.date_index_name.timezone
        });
      }

      if (!isEmpty(processorEsDocument.date_index_name.locale)) {
        assign(result, {
          locale: processorEsDocument.date_index_name.locale
        });
      }

      if (!isEmpty(processorEsDocument.date_index_name.index_name_format)) {
        assign(result, {
          index_name_format: processorEsDocument.date_index_name.index_name_format
        });
      }

      return result;
    }
  };
}
