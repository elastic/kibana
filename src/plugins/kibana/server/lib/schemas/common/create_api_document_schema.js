const Joi = require('joi');

module.exports = function (primary, included) {
  const doc = {data: primary};
  if (included) {
    doc.included = included;
  }

  return Joi.object(doc);
};


