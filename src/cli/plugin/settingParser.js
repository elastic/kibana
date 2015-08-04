var { resolve } = require('path');
var expiry = require('expiry-js');

module.exports = function (options) {
  function parseMilliseconds(val) {
    var result;

    try {
      var timeVal = expiry(val);
      result = timeVal.asMilliseconds();
    } catch (ex) {
      result = 0;
    }

    return result;
  }

  function generateDownloadUrl(settings) {
    var version = (settings.version) || 'latest';
    var filename = settings.package + '-' + version + '.tar.gz';

    return 'https://download.elastic.co/' + settings.organization + '/' + settings.package + '/' + filename;
  }

  function generateGithubUrl(settings) {
    var version = (settings.version) || 'master';
    var filename = version + '.tar.gz';

    return 'https://github.com/' + settings.organization + '/' + settings.package + '/archive/' + filename;
  }

  function parse() {
    var parts;
    var settings = {
      timeout: 0,
      silent: false,
      quiet: false,
      urls: []
    };

    if (options.timeout) {
      settings.timeout = options.timeout;
    }

    if (options.parent && options.parent.quiet) {
      settings.quiet = options.parent.quiet;
    }

    if (options.silent) {
      settings.silent = options.silent;
    }

    if (options.url) {
      settings.urls.push(options.url);
    }

    if (options.install) {
      settings.action = 'install';
      parts = options.install.split('/');

      if (options.url) {
        if (parts.length !== 1) {
          throw new Error('Invalid install option. When providing a url, please use the format <plugin>.');
        }

        settings.package = parts.shift();
      } else {
        if (parts.length < 2 || parts.length > 3) {
          throw new Error('Invalid install option. Please use the format <org>/<plugin>/<version>.');
        }

        settings.organization = parts.shift();
        settings.package = parts.shift();
        settings.version = parts.shift();

        settings.urls.push(generateDownloadUrl(settings));
        settings.urls.push(generateGithubUrl(settings));
      }
    }

    if (options.remove) {
      settings.action = 'remove';
      parts = options.remove.split('/');

      if (parts.length !== 1) {
        throw new Error('Invalid remove option. Please use the format <plugin>.');
      }
      settings.package = parts.shift();
    }

    if (!settings.action || (options.install && options.remove)) {
      throw new Error('Please specify either --install or --remove.');
    }

    settings.pluginDir = options.pluginDir;
    if (settings.package) {
      settings.pluginPath = resolve(settings.pluginDir, settings.package);
      settings.workingPath = resolve(settings.pluginDir, '.plugin.installing');
    }

    return settings;
  }

  return {
    parse: parse,
    parseMilliseconds: parseMilliseconds
  };
};
