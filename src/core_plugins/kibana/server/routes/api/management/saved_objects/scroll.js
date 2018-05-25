import Joi from 'joi';

async function findAll(savedObjectsClient, findOptions, page = 1, allObjects = []) {
  const objects = await savedObjectsClient.find({
    ...findOptions,
    page
  });

  allObjects.push(...objects.saved_objects);
  if (allObjects.length < objects.total) {
    return findAll(savedObjectsClient, findOptions, page + 1, allObjects);
  }

  return allObjects;
}

export function registerScrollForExportRoute(server) {
  server.route({
    path: '/api/kibana/management/saved_objects/scroll/export',
    method: ['POST'],
    config: {
      validate: {
        payload: Joi.object().keys({
          typesToInclude: Joi.array().items(Joi.string()).required(),
        }).required(),
      },
    },

    handler: async (req, reply) => {
      const savedObjectsClient = req.getSavedObjectsClient();
      const objects = await findAll(savedObjectsClient, {
        perPage: 1000,
        typesToInclude: req.payload.typesToInclude
      });
      const response = objects.map(hit => {
        const type = hit.type;
        return {
          _id: hit.id,
          _type: type,
          _source: hit.attributes,
          _meta: {
            savedObjectVersion: 2
          }
        };
      });

      reply(response);
    }
  });
}

export function registerScrollForCountRoute(server) {
  server.route({
    path: '/api/kibana/management/saved_objects/scroll/counts',
    method: ['POST'],
    config: {
      validate: {
        payload: Joi.object().keys({
          typesToInclude: Joi.array().items(Joi.string()).required(),
          searchString: Joi.string()
        }).required(),
      },
    },

    handler: async (req, reply) => {
      const savedObjectsClient = req.getSavedObjectsClient();
      const findOptions = {
        type: req.payload.typesToInclude,
        perPage: 1000,
      };

      if (req.payload.searchString) {
        findOptions.search = `${req.payload.searchString}*`;
        findOptions.searchFields = ['title'];
      }

      const objects = await findAll(savedObjectsClient, findOptions);
      const counts = objects.reduce((accum, result) => {
        const type = result.type;
        accum[type] = accum[type] || 0;
        accum[type]++;
        return accum;
      }, {});

      for (const type of req.payload.typesToInclude) {
        if (!counts[type]) {
          counts[type] = 0;
        }
      }

      reply(counts);
    }
  });
}
