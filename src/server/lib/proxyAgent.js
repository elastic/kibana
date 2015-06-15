var _ = require('lodash');
var config = require('../config');
var Agent = require('http').Agent;
var SslAgent = require('https').Agent;
var read = _.partialRight(require('fs').readFileSync, 'utf8');

exports.buildHttpAgent = function () {
  return new Agent(exports.basicAgentConfig());
};

exports.basicAgentConfig = function basicAgentConfig() {
  return _.pick(config, 'maxSockets');
};

exports.buildHttpsAgent = function buildForHttps() {
  var kbnConfig = config.kibana || {};
  var caPath = kbnConfig.ca;
  var crtPath = kbnConfig.kibana_elasticsearch_client_crt;
  var keyPath = kbnConfig.kibana_elasticsearch_client_key;
  var verifySsl = kbnConfig.verify_ssl;

  var agentConfig = exports.basicAgentConfig();

  // If the target is backed by an Ssl and a CA is provided via the config
  // then we need to inject the CA
  if (caPath) agentConfig.ca = read(caPath);

  // Add client certificate and key if provided
  if (crtPath && keyPath) {
    agentConfig.cert = read(crtPath);
    agentConfig.key = read(keyPath);
  }

  agentConfig.rejectUnauthorized = verifySsl;

  return new SslAgent(agentConfig);
};

exports.buildForProtocol = function (protocol) {
  return /^https/.test(protocol) ? exports.buildHttpsAgent() : exports.buildHttpAgent();
};
