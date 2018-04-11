const glob = require('glob');
const { join, basename } = require('path');
const { readFileSync } = require('fs');
const { merge, pick } = require('lodash');

export function getSpec() {
  const generatedFiles = glob.sync(join(__dirname, 'generated', '*.json'));
  const overrideFiles = glob.sync(join(__dirname, 'overrides', '*.json'));

  return generatedFiles.reduce((acc, file) => {
    const overrideFile = overrideFiles.find(f => basename(f) === basename(file));
    let spec = JSON.parse(readFileSync(file, 'utf8'));
    if (overrideFile) {
      merge(spec, JSON.parse(readFileSync(overrideFile, 'utf8')));
    }
    const collisions = pick(spec, function (v, k) { return acc[k]; });
    if (JSON.stringify(collisions) !== '{}') {
      const newSpec = {};
      Object.entries(collisions).forEach(([ endpoint, definition ]) => {
        // make the key of the spec unique when there is a collision with another spec
        newSpec[`${endpoint}${Date.now()}`] = definition;
      });
      spec = newSpec;
    }

    return { ...acc, ...spec };
  }, {});
  return result;
}
