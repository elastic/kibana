var _ = require('lodash');
var fs = require('fs');
var yaml = require('js-yaml');
var path = require('path');
var listPlugins = require('../lib/listPlugins');
var configPath = process.env.CONFIG_PATH || path.join(__dirname, 'kibana.yml');
var kibana = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
var env = process.env.NODE_ENV || 'development';

// Check if the local public folder is present. This means we are running in
// the NPM module. If it's not there then we are running in the git root.
var public_folder = path.resolve(__dirname, '..', 'public');
try {
  fs.statSync(public_folder);
} catch (err) {
  public_folder = path.resolve(__dirname, '..', '..', 'kibana');
}

var config = module.exports = {
  port                    : kibana.port || 5601,
  host                    : kibana.host || '0.0.0.0',
  elasticsearch           : kibana.elasticsearch_url || 'http           : //localhost : 9200',
  root                    : path.normalize(path.join(__dirname, '..')),
  quiet                   : false,
  public_folder           : public_folder,
  external_plugins_folder : process.env.PLUGINS_FOLDER || null,
  bundled_plugins_folder  : path.resolve(public_folder, 'plugins'),
  kibana                  : kibana
};

config.plugins = listPlugins(config);
