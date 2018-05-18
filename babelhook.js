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
        {
          // ugly hack so that importing non-js files works, required for the function docs
          pattern: '.(less|png|svg)$',
          location: resolve(__dirname, 'tasks', 'mocks', 'noop'),
        },
        {
          pattern: 'plugins/canvas/apps',
          location: resolve(__dirname, 'tasks', 'mocks', 'noop'),
        },
      ],
    ],
  ],
};

register(options);
