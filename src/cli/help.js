import _ from 'lodash';

module.exports = function (command, spaces) {
  if (!_.size(command.commands)) {
    return command.outputHelp();
  }

  const defCmd = _.find(command.commands, function (cmd) {
    return cmd._name === 'serve';
  });

  const desc = !command.description() ? '' : command.description();
  const cmdDef = !defCmd ? '' : `=${defCmd._name}`;

  return (
`
Usage: ${command._name} [command${cmdDef}] [options]

${desc}

Commands:
${indent(commandsSummary(command), 2)}

${cmdHelp(defCmd)}
`
  ).trim().replace(/^/gm, spaces || '');
};

function indent(str, n) {
  return String(str || '').trim().replace(/^/gm, _.repeat(' ', n));
}

function commandsSummary(program) {
  const cmds = _.compact(program.commands.map(function (cmd) {
    const name = cmd._name;
    if (name === '*') return;
    const opts = cmd.options.length ? ' [options]' : '';
    const args = cmd._args.map(function (arg) {
      return humanReadableArgName(arg);
    }).join(' ');

    return [
      `${name} ${opts} ${args}`,
      cmd.description()
    ];
  }));

  const cmdLColWidth = cmds.reduce(function (width, cmd) {
    return Math.max(width, cmd[0].length);
  }, 0);

  return cmds.reduce(function (help, cmd) {
    return `${help || ''}${_.padRight(cmd[0], cmdLColWidth)} ${cmd[1] || ''}\n`;
  }, '');
}

function cmdHelp(cmd) {
  if (!cmd) return '';
  return (

`
"${cmd._name}" Options:

${indent(cmd.optionHelp(), 2)}
`

  ).trim();

}

function humanReadableArgName(arg) {
  const nameOutput = arg.name + (arg.variadic === true ? '...' : '');
  return arg.required ? '<' + nameOutput + '>' : '[' + nameOutput + ']';
}
