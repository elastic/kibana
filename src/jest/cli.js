import jest from 'jest';
import { resolve } from 'path';

const argv = process.argv.slice(2);

argv.push('--config', resolve(__dirname, './config.json'));

jest.run(argv);
