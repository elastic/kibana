const keysDeep = require('../lib/keys_deep');
const cleanDeep = require('../lib/clean_deep');
const _ = require('lodash');

function update(object, originalObject, added, removed) {
  //removeDirtyProperties(object, originalObject);
  mutateClone(object, originalObject);

  keysDeep(added).forEach((key) => {
    _.set(object, key, _.get(added, key));
  });

  if (removed) {
    removed.forEach((key) => {
      delete object[key];
    });
  }

  return object;
}

function mutateClone(object, sourceObject) {
  const objectKeys = _.keysIn(object);
  const sourceKeys = _.keysIn(sourceObject);

  const removed = _.difference(objectKeys, sourceKeys);
  const added = _.difference(sourceKeys, objectKeys);
  const common = _.intersection(objectKeys, sourceKeys);
  const commonOrAdded = added.concat(common);

  removed.forEach((key) => {
    delete object[key];
  });

  commonOrAdded.forEach((key) => {
    if (_.isArray(sourceObject[key])) {
      object[key] = mutateCloneArray(sourceObject[key]);
    } else if (_.isObject(sourceObject[key])) {
      object[key] = {};
      mutateClone(object[key], sourceObject[key]);
    } else {
      object[key] = sourceObject[key];
    }
  });
}

function mutateCloneArray(sourceArray) {
  const result = [];

  sourceArray.map((element) => {
    if (_.isArray(element)) {
      result.push(mutateCloneArray(sourceObject[key]));
    } else if (_.isObject(element)) {
      var newObj = []
      mutateClone(newObj, element);
      result.push(newObj);
    } else {
      result.push(element);
    }
  });

  return result;
}

export default {
  update: update,
  mutateClone: mutateClone
}
