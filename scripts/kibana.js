if((require('../package.json')).engines.node  !== process.version) {
  console.error('Kibana does not support Node version ' + process.versions.node + ', please use Node.js 6.0 or higher.');
  process.exit(1);
}

require('../src/babel-register');
require('../src/cli/cli');
