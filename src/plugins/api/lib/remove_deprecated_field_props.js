const _ = require('lodash');

module.exports = function removeDeprecatedFieldProps(patternResources) {
  if (_.isEmpty(patternResources)) { return patternResources; }
  if (!_.isArray(patternResources)) { patternResources = [patternResources]; }

  patternResources.forEach((patternResource) => {
    patternResource.fields.forEach((field) => {
      delete field.type;
      delete field.indexed;
      delete field.analyzed;
      delete field.doc_values;
    });
  });

  return patternResources;
};
