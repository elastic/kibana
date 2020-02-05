require('../../../../../src/setup_node_env');

const [ , , buildNumber, outFile ] = process.argv;

require('./bootstrap_app_initial_data').populate(buildNumber, outFile);
