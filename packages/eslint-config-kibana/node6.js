module.exports = function(options) {
  return Object.assign(
    {
      env: {
        es6: true,
        node: true,
      },
    },
    options
  );
};
