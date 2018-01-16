const glob = require('glob')
const { join } = require('path')
const { readFileSync } = require('fs')

export function getSpec() {
  const files = glob.sync(join(__dirname, '*.json'))
  return files.reduce((acc, file) => {
    const spec = JSON.parse(readFileSync(file, 'utf8'))
    return { ...acc, ...spec };
  }, {});
  return result
}
