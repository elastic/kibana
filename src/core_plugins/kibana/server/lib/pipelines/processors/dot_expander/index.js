import schemaProvider from './schema';
import converterProvider from './converter';

export default function (server) {
  const kibana = server.plugins.kibana;

  kibana.pipelines.processors.register({
    dot_expander: {
      converterProvider: converterProvider,
      schemaProvider: schemaProvider
    }
  });
}
