import _ from 'lodash';

export default function (func) {
  const functions = {};
  functions[func.name] = func;
  if (func.aliases) {
    _.each(func.aliases, function (alias) {
      const aliasFn = _.clone(func);
      aliasFn.isAlias = true;
      functions[alias] = aliasFn;
    });
  }

  return functions;
}
