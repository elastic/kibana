const templatePkg = require('./package.json');
const kibanaPkg = require('../kibana/package.json');

const debugInfo = {
  kibana: {
    version: kibanaPkg.version,
    build: kibanaPkg.build,
    engines: kibanaPkg.engines,
  },
  plugin: {
    name: templatePkg.name,
    version: templatePkg.version,
    kibana: templatePkg.kibana,
    dependencies: templatePkg.dependencies,
  },
};

console.log(debugInfo);