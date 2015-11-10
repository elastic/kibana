module.exports = function (token) {

  function forbidden(res, message) {
    res.status(403).json(message);
  }

  return function (req, res, next) {
    if (req.method === 'GET') return next();

    var attempt = req.get('kbn-xsrf-token');
    if (!attempt) return forbidden(res, 'Missing XSRF token');
    if (attempt !== token) return forbidden(res, 'Invalid XSRF token');

    return next();
  };
};
