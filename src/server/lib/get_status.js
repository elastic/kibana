var status = require('./status');
module.exports = function (name) {
  return status[name] || { state: 'red' };
};
