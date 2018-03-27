require('../../babel-register');

process.send('ready');

const nativeControllerPath = process.argv[2];

const receivedMessage = (message) => {
  switch (message) {
    case 'start': {
      require(nativeControllerPath);
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
