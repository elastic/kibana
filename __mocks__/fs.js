const { callbackify } = require('util');

const fs = jest.genMockFromModule('fs');

fs.writeFile = callbackify((...args) => {
  // console.log('Accessing directly writeFile', args);
  return Promise.resolve('fs.writeFile mock value');
});

fs.readFile = callbackify((...args) => {
  // console.log('Accessing directly readFile', args);
  return Promise.resolve('fs.readFile mock value');
});

fs.stat = callbackify((...args) => {
  // console.log('Accessing directly stat', args);
  return Promise.resolve({
    isDirectory: () => {},
    __mock: 'fs.stat mock value'
  });
});

fs.chmod = callbackify((...args) => {
  // console.log('Accessing directly chmod', args);
  return Promise.resolve('fs.chmod mock value');
});

module.exports = fs;
