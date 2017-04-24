export const createGetTypesRoute = prereqs => ({
  method: 'GET',
  path: '/api/kibana/saved_objects/types',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    handler(request, reply) {
      const { savedObjectsClient } = request.pre;

      reply(
        savedObjectsClient.getDefinedTypes()
        .then(types => ({ types }))
      );
    }
  }
});
