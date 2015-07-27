var _ = require('lodash');

var err = new Error();
setByAssignment(err, 'john');

// err.stack is not always writeable, so we
// do some detection for support and fallback to a
// shadowing method, which "copies" the error but
// keeps the original as the prototype so that
// the error is still an instance of the same
// classes as the original error
if (err.stack === 'john') module.exports = setByAssignment;
else module.exports = setByShadowing;

function setByShadowing(err, stack) {
  var props = _.mapValues(err, function (val) {
    return {
      enumerable: true,
      value: val
    };
  });

  props.stack = {
    enumerable: true,
    value: stack
  };

  return Object.create(err, props);
}

function setByAssignment(err, stack) {
  err.stack = stack;
  return err;
}
