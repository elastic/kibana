import type { InternalConnectorContract } from '../../types/latest';

export function getKibanaConnectors(): InternalConnectorContract[] {
  // TODO: bring the kibana connectors back, with the new approach to schemas generation
  // Lazy load the generated Kibana connectors
  // FIX: this is not really a lazy load, we should use a dynamic import instead
  const {
    GENERATED_KIBANA_CONNECTORS,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('./generated/kibana_connectors.gen');

  return GENERATED_KIBANA_CONNECTORS;
}
