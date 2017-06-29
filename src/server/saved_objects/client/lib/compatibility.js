/**
 * @param {array} objects - [{ type, id, attributes }]
 * @param {object} [options={}]
 * @property {boolean} [options.overwrite=false] - overrides existing documents
 * @returns {array}
 */
export function v5BulkCreate(objects, options = {}) {
  return objects.reduce((acc, object) => {
    const method = object.id && !options.overwrite ? 'create' : 'index';

    acc.push({ [method]: { _type: object.type, _id: object.id } });
    acc.push(object.attributes);

    return acc;
  }, []);
}

/**
 * @param {array} objects - [{ type, id, attributes }]
 * @param {object} [options={}]
 * @property {boolean} [options.overwrite=false] - overrides existing documents
 * @returns {array}
 */
export function v6BulkCreate(objects, options = {}) {
  return objects.reduce((acc, object) => {
    const method = object.id && !options.overwrite ? 'create' : 'index';

    acc.push({ [method]: { _type: 'doc', _id: object.id } });
    acc.push(Object.assign({},
      { type: object.type },
      { [object.type]: object.attributes }
    ));

    return acc;
  }, []);
}
