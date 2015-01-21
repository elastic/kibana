module.exports = function () {
  return function (req, res, next) {
    res.header('X-App-Name', 'kibana');
    next();
  };
};
