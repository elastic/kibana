require('../../babel-register');
const program = require('commander');

program
  .arguments('<nativeControllerPath>')
  .option('--configJSON <value>', 'config in JSON format')
  .action(startNativeController);
program.parse(process.argv);

function startNativeController(nativeControllerPathArg, options) {
  const nativeControllerPath = nativeControllerPathArg;
  const configMap = new Map(Object.entries(options.configJSON ? JSON.parse(options.configJSON) : {}));

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
}



