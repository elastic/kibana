const glob = require('glob');
const { join, basename } = require('path');
const { readFileSync } = require('fs');
const { merge } = require('lodash');

const extensionSpecFilePaths = [];
export function getSpec() {
  const generatedFiles = glob.sync(join(__dirname, 'generated', '*.json'));
  const overrideFiles = glob.sync(join(__dirname, 'overrides', '*.json'));

  const result = generatedFiles.reduce((acc, file) => {
    const overrideFile = overrideFiles.find(f => basename(f) === basename(file));
    const loadedSpec = JSON.parse(readFileSync(file, 'utf8'));
    if (overrideFile) {
      merge(loadedSpec, JSON.parse(readFileSync(overrideFile, 'utf8')));
    }
    const spec = {};
    Object.entries(loadedSpec).forEach(([key, value]) => {
      if (acc[key]) {
        // add time to remove key collision
        spec[`${key}${Date.now()}`] = value;
      } else {
        spec[key] = value;
      }
    });

    return { ...acc, ...spec };
  }, {});
  extensionSpecFilePaths.forEach((extensionSpecFilePath) => {
    const extensionFiles = glob.sync(join(extensionSpecFilePath, '*.json'));
    extensionFiles.forEach((extensionFile) => {
      merge(result, JSON.parse(readFileSync(extensionFile, 'utf8')));
    });
  });
  return result;
}

export function addExtensionSpecFilePath(extensionSpecFilePath) {
  extensionSpecFilePaths.push(extensionSpecFilePath);
}