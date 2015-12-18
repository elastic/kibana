var Promise = require('bluebird');
var AWS = require('aws-sdk');
var logger = require('./logger');
var config = require('../config');

function refreshAWSCredentials() {
  AWS.config.credentials.get(function(err) {
    if(err) {
      logger.error(err);
    } else {
      if(AWS.config.credentials.expired) {
        refreshAWSCredentials();
      } else if(AWS.config.credentials.expireTime) {
        var date = new Date();
        var msWait = AWS.config.credentials.expireTime - date - 15000;
        if(msWait < 0) msWait = 0;
        logger.info("Refreshing AWS credentials in %s", new Date(Number(date) + msWait));
        setTimeout(refreshAWSCredentials, msWait);
      }
    }
  });
}

function waitForAWSCredentials() {
  return new Promise(function(fulfill, reject) {
    if(config.kibana.transport == "AWS") {
      AWS.config.getCredentials(function(err) {
        if(err) reject(err);
        else {
          var date = new Date();
          var msWait = AWS.config.credentials.expireTime - date - 15000;
          if(msWait < 0) msWait = 0;
          logger.info("Refreshing AWS credentials in %s", new Date(Number(date) + msWait));
          setTimeout(refreshAWSCredentials, msWait);
          fulfill(AWS.config.credentials);
        }
      });
    }
  });
}

module.exports = function () {
  return waitForAWSCredentials();
};
