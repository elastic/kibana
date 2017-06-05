function toPojo(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function replacer(match, group) {
  return (new Array(group.length + 1).join('X'));
}

function apply(obj, key, action) {
  for (const k in obj)  {
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
          const matches = action.match(/\/(.+)\//);
          if (matches) {
            const regex = new RegExp(matches[1]);
            obj[k] = ('' + val).replace(regex, replacer);
          }
        }
      } else if (typeof val === 'object') {
        val = apply(val, key, action);
      }
    }
  }
  return obj;
}

module.exports = function (obj, actionsByKey) {
  return Object.keys(actionsByKey).reduce((output, key) => {
    return apply(output, key, actionsByKey[key]);
  }, toPojo(obj));
};
