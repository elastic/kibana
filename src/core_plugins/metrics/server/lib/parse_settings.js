const numericKeys = [
  'alpha',
  'beta',
  'gamma',
  'period'
];
const booleanKeys = [ 'pad' ];
function castBasedOnKey(key, val) {
  if (~numericKeys.indexOf(key)) return Number(val);
  if (~booleanKeys.indexOf(key)) return Boolean(val);
  return val;
}
export default (settingsStr) => {
  return settingsStr.split(/\s/).reduce((acc, value) => {
    const [key, val] = value.split(/=/);
    acc[key] = castBasedOnKey(key, val);
    return acc;
  }, {});
};

