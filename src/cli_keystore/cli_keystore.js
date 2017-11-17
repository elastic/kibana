import { join } from 'path';

import { pkg } from '../utils';
import Command from '../cli/command';
import { getData } from '../server/path';
import { Keystore } from '../server/keystore';

const path = join(getData(), 'kibana.keystore');
const keystore = new Keystore(path);

import { createCli } from './create';
import { listCli } from './list';
import { addCli } from './add';
import { removeCli } from './remove';

const program = new Command('bin/kibana-keystore');

program
  .version(pkg.version)
  .description('A tool for managing settings stored in the Kibana keystore');

createCli(program, keystore);
listCli(program, keystore);
addCli(program, keystore);
removeCli(program, keystore);

program.parse(process.argv);

if (!program.args.length) {
  program.help();
}
