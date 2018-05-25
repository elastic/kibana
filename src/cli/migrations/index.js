const commander = require('commander');
const { newSeed } = require('./new_seed');
const { newTransform } = require('./new_transform');

commander
  .command('new-seed <dir> <filename>')
  .description('Generates a new seed migration in the dir/migrations directory.')
  .action(newSeed);

commander
  .command('new-transform <dir> <filename>')
  .description('Generates a new transform migration in the dir/migrations directory.')
  .action(newTransform);

commander.parse(process.argv);
