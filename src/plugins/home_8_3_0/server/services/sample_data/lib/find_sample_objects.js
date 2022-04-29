/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.findSampleObjects = findSampleObjects;

const esKuery = _interopRequireWildcard(require('@kbn/es-query'));

function _getRequireWildcardCache(nodeInterop) {
  if (typeof WeakMap !== 'function') return null;
  const cacheBabelInterop = new WeakMap();
  const cacheNodeInterop = new WeakMap();
  return (_getRequireWildcardCache = function (nodeInterop) {
    return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
  })(nodeInterop);
}

function _interopRequireWildcard(obj, nodeInterop) {
  if (!nodeInterop && obj && obj.__esModule) {
    return obj;
  }
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return { default: obj };
  }
  const cache = _getRequireWildcardCache(nodeInterop);
  if (cache && cache.has(obj)) {
    return cache.get(obj);
  }
  const newObj = {};
  const hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
  for (const key in obj) {
    if (key !== 'default' && Object.prototype.hasOwnProperty.call(obj, key)) {
      const desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
      if (desc && (desc.get || desc.set)) {
        Object.defineProperty(newObj, key, desc);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  newObj.default = obj;
  if (cache) {
    cache.set(obj, newObj);
  }
  return newObj;
}

const MAX_OBJECTS_TO_FIND = 10000; // we only expect up to a few dozen, search for 10k to be safe; anything over this is ignored

/**
 * Given an array of objects in a sample dataset, this function attempts to find if those objects exist in the current space.
 * It attempts to find objects with an origin of the sample data (e.g., matching `id` or `originId`).
 */
async function findSampleObjects({ client, logger, objects }) {
  const bulkGetResponse = await client.bulkGet(objects);
  let resultsMap = new Map();
  const objectsToFind = [];
  objects.forEach((object, i) => {
    const bulkGetResult = bulkGetResponse.saved_objects[i];

    if (!bulkGetResult.error) {
      const { type, id } = object;
      const key = getObjKey(type, id);
      resultsMap.set(key, id);
    } else if (bulkGetResult.error.statusCode === 404) {
      objectsToFind.push(object);
    }
  });

  if (objectsToFind.length > 0) {
    const options = {
      type: getUniqueTypes(objectsToFind),
      filter: createKueryFilter(objectsToFind),
      fields: ['title'],
      // we don't want to return all source fields, so we have to specify at least one source field
      perPage: MAX_OBJECTS_TO_FIND,
    };
    const findResponse = await client.find(options);

    if (findResponse.total > MAX_OBJECTS_TO_FIND) {
      // As of this writing, it is not possible to encounter this scenario when using Kibana import or copy-to-space, because at most one
      // object can exist in a given space. However, as of today, when objects are shareable you _could_ get Kibana into a state where
      // multiple objects of the same origin exist in the same space.
      // #116677 describes solutions to fully mitigate this edge case in the future.
      logger.warn(
        `findSampleObjects got ${findResponse.total} results, only using the first ${MAX_OBJECTS_TO_FIND}`
      );
    }

    resultsMap = findResponse.saved_objects.reduce((acc, { type, id, originId }) => {
      const key = getObjKey(type, originId);
      const existing = acc.get(key);

      if (existing) {
        // As of this writing, it is not possible to encounter this scenario when using Kibana import or copy-to-space, because at most one
        // object can exist in a given space. However, as of today, when objects are shareable you _could_ get Kibana into a state where
        // multiple objects of the same origin exist in the same space.
        // #116677 describes solutions to fully mitigate this edge case in the future.
        logger.warn(
          `Found two sample objects with the same origin "${originId}" (previously found "${existing}", ignoring "${id}")`
        );
        return acc;
      }

      return acc.set(key, id);
    }, resultsMap);
  }

  return objects.map(({ type, id }) => {
    const key = getObjKey(type, id);
    return {
      type,
      id,
      foundObjectId: resultsMap.get(key),
    };
  });
}

function getUniqueTypes(objects) {
  return [...new Set(objects.map(({ type }) => type))];
}

function createKueryFilter(objects) {
  const { buildNode } = esKuery.nodeTypes.function;
  const kueryNodes = objects.map(({ type, id }) => buildNode('is', `${type}.originId`, id)); // the repository converts this node into "and (type is ..., originId is ...)"

  return buildNode('or', kueryNodes);
}

function getObjKey(type, id) {
  return `${type}:${id}`;
}
