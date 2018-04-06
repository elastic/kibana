require('../../babel-register');
const program = require('commander');

let nativeControllerPath;
let configMap;
program
  .arguments('<nativeControllerPath> [config...]')
  .action((nativeControllerPathArg, configArs) => {
    nativeControllerPath = nativeControllerPathArg;
    configMap = configArs.reduce((map, arg) => {
      const [ , name, value] = /^(.+)=(.+)/.exec(arg);
      map.set(name, value);
      return map;
    }, new Map());
  });
program.parse(process.argv);

const receivedMessage = (message) => {
  switch (message) {
    case 'start': {
      require(nativeControllerPath)(configMap);
      process.removeListener('message', receivedMessage);
      process.send('started');
      break;
    }
    default: {
      throw new Error(`Received unknown message ${message}`);
    }
  }
};

process.addListener('message', receivedMessage);
process.send('ready');
