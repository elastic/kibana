require('../../../../../src/setup_node_env');

const buildNumber = process.argv[2];

require('./bootstrap_app_initial_data').populate(buildNumber);
