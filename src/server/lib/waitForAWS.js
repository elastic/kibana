var Promise = require('bluebird');
var AWS = require('aws-sdk');
var logger = require('./logger');
var config = require('../config');

function waitForAWSCredentials() {
  return new Promise(function(fulfill, reject) {
    if(config.kibana.transport == "AWS") {
      AWS.config.getCredentials(function(err) {
        if(err) {
          reject(err);
        }
        else fulfill(AWS.config.credentials);
      });
    }
  });
}

module.exports = function () {
  return waitForAWSCredentials();
};
