require('../../babel-register');
const program = require('commander');

program
  .arguments('<nativeControllerPath>')
  .action(startNativeController);
program.parse(process.argv);

function startNativeController(nativeControllerPathArg) {
  const nativeControllerPath = nativeControllerPathArg;
  let configMap;

  const receivedMessage = (message) => {
    switch (message.type) {
      case 'start': {
        if (!configMap) {
          throw new Error('configure must be called before start');
        }
        require(nativeControllerPath)(configMap);
        process.removeListener('message', receivedMessage);
        process.send('started');
        break;
      }
      case 'configure': {
        if (configMap) {
          throw new Error('Can only configure once');
        }
        configMap = new Map(Object.entries(message.payload || {}));
        process.send('configured');
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



