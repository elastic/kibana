var status = require('./status');
module.exports = function (name, color, message ) {
  status[name] = { state: color, message: message };
};
