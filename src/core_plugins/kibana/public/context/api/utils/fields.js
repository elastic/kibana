import _ from 'lodash';


const addComputedFields = _.curry(function addComputedFields(indexPattern, queryBody) {
  const computedFields = indexPattern.getComputedFields();

  return Object.assign(
    {},
    queryBody,
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
