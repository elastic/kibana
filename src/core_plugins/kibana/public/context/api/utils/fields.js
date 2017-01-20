import _ from 'lodash';


const addComputedFields = _.curry(function addComputedFields(indexPattern, query) {
  const computedFields = indexPattern.getComputedFields();

  return Object.assign(
    {},
    query,
    {
      script_fields: computedFields.scriptFields,
      docvalue_fields: computedFields.docvalueFields,
      stored_fields: computedFields.storedFields,
    },
  );
});


export {
  addComputedFields,
};
