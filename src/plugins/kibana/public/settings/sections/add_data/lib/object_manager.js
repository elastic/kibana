const keysDeep = require('../lib/keys_deep');
const cleanDeep = require('../lib/clean_deep');
const _ = require('lodash');

function update(object, originalObject, added, removed) {
  removeDirtyProperties(object, originalObject);

  keysDeep(added).forEach((key) => {
    _.set(object, key, _.get(added, key));
  });

  return object;
}

function removeDirtyProperties(object, originalObject) {
  let originalKeys = keysDeep(originalObject);
  let objectKeys = keysDeep(object);

  var added = _.difference(objectKeys, originalKeys);
  added.forEach((key) => {
    _.set(object, key, undefined);
  });
  cleanDeep(object);
}


function mutateClone(object, sourceObject) {
  let objectKeys = keysDeep(object);
  let sourceKeys = keysDeep(sourceObject);

  var removed = _.difference(objectKeys, sourceKeys);
  var added = _.difference(sourceKeys, objectKeys);

  console.log('keys to remove', removed);
  console.log('keys to add', added);

  removed.forEach((key) => {
    delete object[key];
  });

  added.forEach((key) => {
    delete _.set(object, key, _.get(sourceObject, key));
  });
}

function newMutateClone(object, sourceObject) {
  _.forIn(object, function(value, key) {
    var fullKey = delimitedBase + key;
    if (_.isArray(value)) {
      result.push(fullKey)
    } else if (_.isObject(value)) {
      result = result.concat(keysDeep(value, fullKey));
    } else {
      result.push(fullKey);
    }
  });
}

export default {
  update: update,
  mutateClone: mutateClone,
  newMutateClone: newMutateClone
}
