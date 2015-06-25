var KbnStatus = require('./KbnStatus');

module.exports = function (kibana) {
  kibana.status = new KbnStatus(kibana.server);
};
