import cp from "child_process";
const orginal = cp.spawn;

// @ts-ignore
cp.spawn = function (command, args, options) {
  // @ts-ignore
  if (command.match(/Cypress/)) {
    // @ts-ignore
    const process = orginal(command, args, {
      ...options,
      // using pipe enables capturing stdout and stderr
      stdio: ["pipe", "pipe", "pipe"],
    });
    return process;
  }

  // @ts-ignore
  return orginal(command, args, options);
};
