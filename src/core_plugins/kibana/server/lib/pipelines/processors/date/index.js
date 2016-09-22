import schemaProvider from './schema';
import converterProvider from './converter';

export default function (server) {
  const kibana = server.plugins.kibana;

  kibana.pipelines.processors.register({
    date: {
      converterProvider: converterProvider,
      schemaProvider: schemaProvider
    }
  });
}
