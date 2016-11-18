import _ from 'lodash';


function addComputedFields(indexPattern, query) {
  const computedFields = indexPattern.getComputedFields();

  return _.assign({}, query, {
    script_fields: computedFields.scriptFields,
    docvalue_fields: computedFields.docvalueFields,
    stored_fields: computedFields.storedFields,
  });
};


export {
  addComputedFields,
};
