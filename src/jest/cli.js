import jest from 'jest';
import { config } from './config';

const argv = process.argv.slice(2);

argv.push('--config', JSON.stringify(config));

jest.run(argv);
