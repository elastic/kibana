var Promise = require('bluebird');
var _ = require('lodash');
var request = require('request');
var RcLoader = require('rcloader');
var url = require('url');
module.exports = function (plugin, version) {
  var rcloader = new RcLoader('.esvm_snapshot_credentials.json');
  var credentials = rcloader.for('.esvm_snapshot_credentials.json');
  var baseURL = 'https://maven.elasticsearch.org/internal-snapshots/org/elasticsearch/plugin/' + plugin.name + '/' + version;
	return new Promise(function (resolve, reject) {
		var options = {
			url: baseURL + '/maven-metadata.xml',
      auth: {
        user: credentials.username,
        pass: credentials.password
      }
		};
    request(options, function (err, resp, body) {
      var urlObj;
      if (err) return reject(err);
      var matches = body.match(/<value>([^<]+)<\/value>/);
      if (matches) {
        urlObj = url.parse(baseURL + '/' + plugin.name + '-' + matches[1] + '.zip');
        urlObj.auth = credentials.username + ':' + credentials.password;
        resolve(url.format(urlObj));
      } else {
        reject(new Error('Unable to parse version from maven-metadata.xml for ' + plugin.name + '(' + version + ')'));
      }
    });
	});
};
