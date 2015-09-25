function replacer(match, group) {
  return (new Array(group.length + 1).join('X'));
}

module.exports = function applyFilterToKey(obj, key, action) {
  for (let k in obj)  {
    if (obj.hasOwnProperty(k)) {
      let val = obj[k];
      if (k === key) {
        val = ''  + val;
        if (action === 'remove') delete obj[k];
        if (action === 'censor') {
          obj[k] = val.replace(/./g, 'X');
        };
        if (action instanceof RegExp) {
          obj[k] = val.replace(action, replacer);
        }
      } else if (typeof val === 'object') {
        applyFilterToKey(val, key, action);
      }
    }
  }
};
