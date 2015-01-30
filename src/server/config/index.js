var _ = require('lodash');
var fs = require('fs');
var yaml = require('js-yaml');
var path = require('path');
var listPlugins = require('../lib/listPlugins');
var configPath = process.env.CONFIG_PATH || path.join(__dirname, 'kibana.yml');
var kibana = yaml.safeLoad(fs.readFileSync(configPath, 'utf8'));
var env = process.env.NODE_ENV || 'development';

function checkPath(path) {
  try {
    fs.statSync(path);
    return true;
  } catch (err) {
    return false;
  }
}

// Check if the local public folder is present. This means we are running in
// the NPM module. If it's not there then we are running in the git root.
var public_folder = path.resolve(__dirname, '..', 'public');
if (!checkPath(public_folder)) public_folder = path.resolve(__dirname, '..', '..', 'kibana');

// Check to see if htpasswd file exists in the root directory otherwise set it to false
var htpasswdPath = path.resolve(__dirname, '..', '.htpasswd');
if (!checkPath(htpasswdPath)) htpasswdPath = path.resolve(__dirname, '..', '..', '..', '.htpasswd');
if (!checkPath(htpasswdPath)) htpasswdPath = false;

var packagePath = path.resolve(__dirname, '..', 'package.json');
try {
  fs.statSync(packagePath);
} catch (err) {
  packagePath = path.resolve(__dirname, '..', '..', '..', 'package.json');
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
  kibana                  : kibana,
  package                 : require(packagePath),
  htpasswd                : htpasswdPath
};

config.plugins = listPlugins(config);
