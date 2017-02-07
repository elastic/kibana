export default function (program) {
  function isCommand(val) {
    return typeof val === 'object' && val._name;
  }

  program.isCommandSpecified = function () {
    return program.args.some(isCommand);
  };
}
