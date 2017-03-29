const jest = require('jest');
const config = require('../test/jest/config');

const argv = process.argv.slice(2);

argv.push('--env=jsdom');
argv.push('--config', JSON.stringify(config));

jest.run(argv);
