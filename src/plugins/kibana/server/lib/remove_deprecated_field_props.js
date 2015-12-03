const _ = require('lodash');

module.exports = function removeDeprecatedFieldProps(patternResources) {
  if (_.isEmpty(patternResources)) { return patternResources; }

  function removeFields(patternResource) {
    patternResource.fields.forEach((field) => {
      delete field.type;
      delete field.indexed;
      delete field.analyzed;
      delete field.doc_values;
    });
  }

  if (_.isArray(patternResources)) {
    patternResources.forEach((patternResource) => {
      removeFields(patternResource);
    });
  }
  else {
    removeFields(patternResources);
  }


  return patternResources;
};
