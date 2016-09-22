import { assign, forEach, contains, isEmpty, uniq } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const formats = [];
      processorApiDocument.formats.forEach((format) => {
        if (format.toUpperCase() === 'CUSTOM') {
          if (processorApiDocument.custom_format) {
            formats.push(processorApiDocument.custom_format);
          }
        } else {
          formats.push(format);
        }
      });

      const result = baseConverter.kibanaToEs(processorApiDocument, 'date');
      assign(result.date, {
        field: processorApiDocument.source_field,
        formats: formats
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

      const standardFormats = ['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N'];

      const formats = [];
      let customFormat = '';
      forEach(processorEsDocument.date.formats, (format) => {
        if (contains(standardFormats, format.toUpperCase())) {
          formats.push(format.toUpperCase());
        } else {
          formats.push('CUSTOM');
          customFormat = format;
        }
      });

      assign(result, {
        source_field: processorEsDocument.date.field,
        formats: uniq(formats),
        custom_format: customFormat
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
