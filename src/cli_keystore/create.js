import inquirer from 'inquirer';
import Logger from '../cli_plugin/lib/logger';

export async function create(keystore, command, options) {
  const logger = new Logger(options);

  if (keystore.exists()) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'A Kibana keystore already exists. Overwrite?',
      default: false
    }]);

    if (!overwrite) {
      return logger.log('Exiting without modifying keystore.');
    }
  }

  keystore.save();

  logger.log(`Created Kibana keystore in ${keystore.path}`);
}

export function createCli(program, keystore) {
  program
    .command('create')
    .description('Creates a new Kibana keystore')
    .option('-v, --verbose', 'turns on verbose logging')
    .option('-s, --silent', 'prevent all logging')
    .action(create.bind(null, keystore));
}
