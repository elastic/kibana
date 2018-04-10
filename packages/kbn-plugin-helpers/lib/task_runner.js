const run = require('./run');

module.exports = function createTaskRunner(taskName, getOptions = () => {}) {
  return async (command, ...args) => {
    try {
      await run(taskName, getOptions(...args));
    } catch (error) {
      process.stderr.write(`Task "${taskName}" failed:\n\n${error.stack || error.message}\n`);
      process.exit(1);
    }
  };
};
