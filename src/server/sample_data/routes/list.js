export const createListRoute = () => ({
  path: '/api/sample_data',
  method: 'GET',
  config: {
    handler(request, reply) {
      const sampleDataSets = request.server.getSampleDataSets().map(sampleDataSet => {
        return {
          id: sampleDataSet.id,
          name: sampleDataSet.name,
          description: sampleDataSet.description
        };
      });
      reply(sampleDataSets);
    }
  }
});
