import expiry from 'expiry-js';
import { intersection } from 'lodash';
import { resolve } from 'path';

export default function createSettingParser(options) {
  function parseMilliseconds(val) {
    let result;

    try {
      let timeVal = expiry(val);
      result = timeVal.asMilliseconds();
    } catch (ex) {
      result = 0;
    }

    return result;
  }

  function generateDownloadUrl(settings) {
    const version = (settings.version) || 'latest';
    const filename = settings.package + '-' + version + '.tar.gz';

    return 'https://download.elastic.co/' + settings.organization + '/' + settings.package + '/' + filename;
  }

  function areMultipleOptionsChosen(options, choices) {
    return intersection(Object.keys(options), choices).length > 1;
  }

  function parse() {
    let parts;
    let settings = {
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

    if (options.config) {
      settings.config = options.config;
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

    if (options.list) {
      settings.action = 'list';
    }

    if (!settings.action || areMultipleOptionsChosen(options, [ 'install', 'remove', 'list' ])) {
      throw new Error('Please specify either --install, --remove, or --list.');
    }

    settings.pluginDir = options.pluginDir;
    if (settings.package) {
      settings.pluginPath = resolve(settings.pluginDir, settings.package);
      settings.workingPath = resolve(settings.pluginDir, '.plugin.installing');
      settings.tempArchiveFile = resolve(settings.workingPath, 'archive.part');
    }

    return settings;
  }

  return {
    parse: parse,
    parseMilliseconds: parseMilliseconds
  };
};
