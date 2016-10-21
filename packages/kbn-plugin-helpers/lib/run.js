var idPlugin = require('./id_plugin');

module.exports = function run(name) {
  var action = require('../tasks/' + name);
  return function () {
    // call the action function with the plugin, then all
    // renaining arguments from commander
    action.apply(null, [idPlugin()].concat([].slice.apply(arguments)));
  };
};
