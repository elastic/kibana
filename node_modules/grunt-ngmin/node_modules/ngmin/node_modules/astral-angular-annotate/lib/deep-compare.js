/*
 * Checks each property of the standard recursively against the candidate,
 * ignoring additional properties of the candidate.
 * Returns true iff the candidate matches each of the standard's
 * properties
 */

var deepCompare = module.exports = function (candidate, standard) {
  if (!standard && !candidate) {
    return true;
  } else if (standard && !candidate) {
    return false;
  }
  for (var prop in standard) {
    if (standard.hasOwnProperty(prop)) {

      // undefinded case
      if (!candidate[prop]) {
        return false;

      // regex
      } else if (standard[prop] instanceof RegExp) {
        if (!standard[prop].test(candidate[prop])) {
          return false;
        }

      // array
      } else if (standard[prop] instanceof Array) {
        for (var i = 0; i < standard[prop].length; i += 1) {
          if (!deepCompare(candidate[prop][i], standard[prop][i])) {
            return false;
          }
        }

      // object
      } else if (typeof standard[prop] === 'object') {
        if (!deepCompare(candidate[prop], standard[prop])) {
          return false;
        }

      // primative case
      } else if (candidate[prop] !== standard[prop]) {
        return false;
      }
    }
  }
  return true;
};
