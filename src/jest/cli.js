const jest = require('jest');
const config = require('./config');

const argv = process.argv.slice(2);

argv.push('--config', JSON.stringify(config));

jest.run(argv);

