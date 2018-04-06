const chalk = require('chalk');
const getopts = require('getopts');
const dedent = require('dedent');
const commands = require('./cli_commands');
const { isCliError } = require('./errors');
const { log } = require('./utils');

function help() {
  const availableCommands = Object.keys(commands).map(
    name => `${name} - ${commands[name].description}`
  );

  console.log(dedent`
    usage: es <command> [<args>]

    Assists with running Elasticsearch for Kibana development

    Available commands:

      ${availableCommands.join('\n      ')}

    Global options:

      --help
  `);
}

exports.run = async (defaults = {}) => {
  try {
    const argv = process.argv.slice(2);
    const options = getopts(argv, {
      alias: {
        h: 'help',
      },

      default: defaults,
    });
    const args = options._;
    const commandName = args[0];

    if (args.length === 0 || (!commandName && options.help)) {
      help();
      return;
    }

    const command = commands[commandName];

    if (command === undefined) {
      log.error(
        chalk.red(`[${commandName}] is not a valid command, see 'es --help'`)
      );
      process.exitCode = 1;
      return;
    }

    if (commandName && options.help) {
      log.write(dedent`
        usage: ${command.usage || `es ${commandName} [<args>]`}

        ${command.description}

        ${command.help(defaults).replace(/\n/g, '\n       ')}
      `);
      return;
    }

    await command.run(defaults);
  } catch (error) {
    if (isCliError(error)) {
      // only log the message, the CLI explicitly threw this message
      // and it doesn't need a stack trace
      log.error(error.message);
    } else {
      log.error('Unhandled error');
      log.error(error);
    }

    process.exitCode = 1;
  }
};
