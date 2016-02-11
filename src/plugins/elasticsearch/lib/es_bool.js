const map = {
  'false': false,
  'off': false,
  'no': false,
  '0': false,
  'true': true,
  'on': true,
  'yes': true,
  '1': true
};
module.exports = function (str) {
  const bool = map[String(str)];
  if (typeof bool !== 'boolean') {
    throw new TypeError('"' + str + '" does not map to an esBool');
  }
  return bool;
};
