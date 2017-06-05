const numericKeys = [
  'alpha',
  'beta',
  'gamma',
  'period'
];
const booleanKeys = [ 'pad' ];
function castBasedOnKey(key, val) {
  if (~numericKeys.indexOf(key)) return Number(val);
  if (~booleanKeys.indexOf(key)) {
    switch(val) {
      case 'true':
      case 1:
      case '1':
        return true;
      default:
        return false;
    }
  }
  return val;
}
export default (settingsStr) => {
  return settingsStr.split(/\s/).reduce((acc, value) => {
    const [key, val] = value.split(/=/);
    acc[key] = castBasedOnKey(key, val);
    return acc;
  }, {});
};

