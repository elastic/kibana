require('../../babel-register');

process.send('ready');

// add comment what this is doing
const [ , , nativeControllerPath, ...configArgs] = process.argv;

const configMap = configArgs.reduce((map, arg) => {
  const [ , name, value] = /^--(.+)=(.+)/.exec(arg);
  map.set(name, value);
  return map;
}, new Map());

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
