require('../../../../../src/setup_node_env');

const [ , , buildNumber, srcFile, destFile ] = process.argv;

require('./bootstrap_app_initial_data').populate(buildNumber, srcFile, destFile);
