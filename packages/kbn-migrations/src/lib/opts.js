module.exports = {
  validate,
};

function validate(def, opts) {
  Object.keys(def).forEach(prop => {
    const types = Array.isArray(def[prop]) ? def[prop] : [def[prop]];
    const val = opts[prop];
    const type = typeof val;
    const isValid = types.some(t => t === 'array' ? Array.isArray(val) : type === t);
    if (!isValid) {
      throw new Error(`Options: property ${prop} must be ${types.join(' or ')}. Got ${type}: ${val}`);
    }
  });
  return opts;
}
