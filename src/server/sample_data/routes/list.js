export const createListRoute = () => ({
  path: '/api/sample_data/list',
  method: 'GET',
  config: {
    handler(request, reply) {
      reply([]);
    }
  }
});
