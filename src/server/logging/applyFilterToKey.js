function replacer(match, group) {
  return (new Array(group.length + 1).join('X'));
}

module.exports = function applyFilterToKey(obj, key, action) {
  for (let k in obj)  {
    if (obj.hasOwnProperty(k)) {
      let val = obj[k];
      if (k === key) {
        if (action === 'remove') {
          delete obj[k];
        }
        else if (action === 'censor' && typeof val === 'object') {
          delete obj[key];
        }
        else if (action === 'censor') {
          obj[k] = ('' + val).replace(/./g, 'X');
        }
        else if (/\/.+\//.test(action)) {
          var matches = action.match(/\/(.+)\//);
          try {
            let regex = new RegExp(matches[1]);
            obj[k] = ('' + val).replace(regex, replacer);
          } catch (e) {
            //meh
          }
        }
      } else if (typeof val === 'object') {
        applyFilterToKey(val, key, action);
      }
    }
  }
};
