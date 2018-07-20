module.exports = jest.fn((path, callback) => {
  callback('Called from mock');
});
