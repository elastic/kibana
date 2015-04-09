var _ = require('lodash');
var checkDependencies = module.exports = function (name, deps, callStack) {
  if (!deps[name]) throw new Error('Missing dependency: ' + name);
  callStack = callStack || [];
  if (_.contains(callStack, name)) {
    callStack.push(name);
    throw new Error('Circular dependency: ' + callStack.join(' -> '));
  }
  for (var i = 0; i < deps[name].length; i++) {
    var task = deps[name][i];
    if (!deps[task]) throw new Error('Missing dependency: ' + task);
    if (deps[task].length) {
      checkDependencies(task, deps, callStack.concat(name));
    }
  }
  return true;
};

