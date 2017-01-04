import { assign, isEmpty, forEach, set, keys } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'script');

      if (!isEmpty(processorApiDocument.language)) {
        assign(result.script, {
          lang: processorApiDocument.language
        });
      }

      if (!isEmpty(processorApiDocument.filename)) {
        assign(result.script, {
          file: processorApiDocument.filename
        });
      }

      if (!isEmpty(processorApiDocument.script_id)) {
        assign(result.script, {
          id: processorApiDocument.script_id
        });
      }

      if (!isEmpty(processorApiDocument.inline_script)) {
        assign(result.script, {
          inline: processorApiDocument.inline_script
        });
      }

      if (processorApiDocument.params.length > 0) {
        const params = {};
        forEach(processorApiDocument.params, (parameter) => {
          if (parameter.name && parameter.value) {
            set(params, parameter.name, parameter.value);
          }
        });

        console.log('params: ' + params);

        if (!isEmpty(params)) {
          assign(result.script, {
            params: params
          });
        }
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'script');

      if (!isEmpty(processorEsDocument.script.lang)) {
        assign(result, {
          language: processorEsDocument.script.lang
        });
      }

      if (!isEmpty(processorEsDocument.script.file)) {
        assign(result, {
          filename: processorEsDocument.script.file
        });
      }

      if (!isEmpty(processorEsDocument.script.id)) {
        assign(result, {
          script_id: processorEsDocument.script.id
        });
      }

      if (!isEmpty(processorEsDocument.script.inline)) {
        assign(result, {
          inline_script: processorEsDocument.script.inline
        });
      }

      if (!isEmpty(processorEsDocument.script.params)) {
        const esParams = processorEsDocument.script.params;
        const params = [];
        forEach(keys(esParams), (key) => {
          //Force the value to a string here because values from the UI will
          //always be strings. If the user loads a pipeline that was created
          //or edited from the REST API, these values may be of types other
          //than string. This is a temporary hack to insure as much consistant
          //behavior as possible.
          params.push({ name: key, value: esParams[key] + '' });
        });

        assign(result, {
          params: params
        });
      }

      return result;
    }
  };
}
