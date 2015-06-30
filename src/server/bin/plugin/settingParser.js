var path = require('path');
var expiry = require('expiry-js');

module.exports = {
  parse: parse,
  parseMilliseconds: parseMilliseconds
};

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

function parse(options) {
  var parts;
  var settings = {
    timeout: 0,
    silent: false,
    urls: []
  };

  settings.workingPath = path.resolve(__dirname, '..', 'plugins', '.plugin.installing');

  if (options.timeout) {
    settings.timeout = options.timeout;
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


      //settings.urls.push('http://www.piyrwljgdambcz.edu/blah.zip');
      //settings.urls.push('https://s3.amazonaws.com/jimtars/badurl1.tar.gz');
      //settings.urls.push('https://s3.amazonaws.com/jimtars/badurl2.tar.gz');
      //settings.urls.push('I should break everything!!!');
      settings.urls.push('https://s3.amazonaws.com/jimtars/badurl3.tar.gz');
      settings.urls.push('https://s3.amazonaws.com/jimtars/badurl4.tar.gz');
      //settings.urls.push('https://s3.amazonaws.com/jimtars/badurl5.tar.gz');
      //settings.urls.push('http://localhost:3000/corrupt.tar.gz');
      //settings.urls.push('https://github.com/spalger/test-plugin/archive/master.tar.gz');
      //settings.urls.push('https://s3.amazonaws.com/jimtars/bowling.tar.gz');
      settings.urls.push('https://s3.amazonaws.com/jimtars/BowlingFull.tar.gz');
      //settings.urls.push('https://s3.amazonaws.com/jimtars/badurl6.tar.gz');
      //settings.urls.push('https://s3.amazonaws.com/jimtars/badurl7.tar.gz');

      //settings.urls.push(generateDownloadUrl(settings));
      //settings.urls.push(generateGithubUrl(settings));
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

  if (settings.package) {
    settings.pluginPath = path.resolve(__dirname, '..', 'plugins', settings.package);
  }

  return settings;
}