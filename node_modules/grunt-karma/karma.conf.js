// Karma configuration

module.exports = function(config) {
  config.set({

    // list of files / patterns to load in the browser
    files: [
      'node_modules/expect.js/index.js',
      'test/**/*.js'
    ]
  });
};
