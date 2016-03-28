module.exports = IpGenerator;

var _ = require('lodash');

function IpGenerator(maxCount, maxSessions) {
  this.maxSessions = maxSessions;
  this.maxCount = maxCount;

  this.sessions = [];
}

IpGenerator.prototype.get = function () {
  var session, index;
  if (this.sessions.length < this.maxSessions) {
    session = [this.makeRandom(), 0];
    index = this.sessions.length;
    this.sessions.push(session);
  } else {
    index = _.random(0, this.sessions.length - 1);
    session = this.sessions[index];
  }

  if (session[1] > this.maxCount) {
    this.sessions.splice(index, 1);
    return this.getIp();
  } else {
    return session[0];
  }
};

IpGenerator.prototype.makeRandom = function () {
  return _.random(0, 255) + '.' +
    _.random(0, 255) + '.' +
    _.random(0, 255) + '.' +
    _.random(0, 255);
};
