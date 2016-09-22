import schemaProvider from './schema';
import converterProvider from './converter';

export default function (server) {
  const kibana = server.plugins.kibana;

  kibana.pipelines.processors.register({
    foreach: {
      converterProvider: converterProvider,
      schemaProvider: schemaProvider
    }
  });
}
