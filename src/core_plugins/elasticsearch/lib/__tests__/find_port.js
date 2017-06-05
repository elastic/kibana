import Promise from 'bluebird';
import portscanner from 'portscanner';

module.exports = function findPort(start, end, host) {
  host = host || 'localhost';
  return new Promise(function (resolve, reject) {
    portscanner.findAPortNotInUse(start, end, host, function (err, port) {
      if (err) return reject(err);
      resolve(port);
    });
  });
};

