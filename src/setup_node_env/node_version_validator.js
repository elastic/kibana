/* eslint-disable no-var */

// Note: This is written in ES5 so we can run this before anything else
// and gives support for older NodeJS versions
var NodeVersion = require('../utils/node_version');

// Validates current the NodeJS version compatibility when Kibana starts.
NodeVersion.runValidator(function () {
  // Action to apply when validation fails: error report + exit.
  console.error(
    `Kibana does not support the current Node.js version ${NodeVersion.getCurrentVersion()}. `
    + `Please use Node.js ${NodeVersion.getRequiredVersion()}.`
  );
  process.exit(1);
});
