const { resolve } = require('path');
const register = require('babel-register');

const options = {
  sourceMaps: false,
  plugins: [
    [
      'mock-imports',
      [
        {
          pattern: 'ui/chrome',
          location: resolve(__dirname, 'tasks', 'mocks', 'uiChrome'),
        },
        {
          pattern: 'ui/notify',
          location: resolve(__dirname, 'tasks', 'mocks', 'uiNotify'),
        },
        {
          pattern: 'ui/storage',
          location: resolve(__dirname, 'tasks', 'mocks', 'uiStorage'),
        },
        {
          pattern: 'socket.io-client',
          location: resolve(__dirname, 'tasks', 'mocks', 'socketClient'),
        },
      ],
    ],
  ],
};

register(options);
