require('../../../../../src/setup_node_env');

const [ , , srcFile, destFile ] = process.argv;

require('./bootstrap_app_initial_data').populate(srcFile, destFile);
