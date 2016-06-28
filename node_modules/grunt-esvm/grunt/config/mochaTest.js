module.exports = function (grunt) {
  // Unit tests.
  return {
    test: {
      options: {
        reporter: 'markdown',
        captureFile: 'SPEC.md',
        quite: true
      },
      src: ['test/index.js']
    }
  };
};