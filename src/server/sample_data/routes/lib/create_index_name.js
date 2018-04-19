export function createIndexName(server, sampleDataSetId) {
  return `${server.config().get('kibana.index')}_sample_data_${sampleDataSetId}`;
}
