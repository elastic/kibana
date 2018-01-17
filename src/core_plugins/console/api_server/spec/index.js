const glob = require('glob')
const { join, basename } = require('path')
const { readFileSync } = require('fs')
const { merge } = require('lodash')

export function getSpec() {
  const generatedFiles = glob.sync(join(__dirname, 'generated', '*.json'))
  const overrideFiles = glob.sync(join(__dirname, 'overrides', '*.json'))

  return generatedFiles.reduce((acc, file) => {
    const overrideFile = overrideFiles.find(f => basename(f) === basename(file))
    const spec = JSON.parse(readFileSync(file, 'utf8'))
    if (overrideFile) {
      merge(spec, JSON.parse(readFileSync(overrideFile, 'utf8')))
    }
    return { ...acc, ...spec };
  }, {});
  return result
}
