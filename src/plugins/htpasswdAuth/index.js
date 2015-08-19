let fs = require('fs');
let Promise = require('bluebird');
let htpasswd = require('htpasswd');
let strategyMap = require('../../server/auth/lib/authStrategyMap');
let name = 'htpasswd';

module.exports = (kibana) => new kibana.Plugin({
  config(Joi) {
    return Joi.object({
      enabled: Joi.boolean().default(true),
      path: Joi.string()
    }).default();
  },

  init(server, options) {
    let config = server.config();
    if (!config.get('auth.enabled') || config.get('auth.strategy') !== name) return;
    let path = config.get('htpasswdAuth.path');
    let users = new Map();

    let initialized = Promise.promisify(fs.readFile)(path).then((data) => {
      let lines = String(data)
        .replace(/\\r\\n/g, '\n')
        .split('\n');

      lines.forEach(function (line) {
        let parts = line.split(':');
        if (parts.length !== 2) return;

        let username = parts.shift();
        let hash = parts.shift();
        users.set(username, hash);
      });
    });

    strategyMap.set('htpasswd', {
      authenticate(request, username, password) {
        return isValid(username, password).then(function () {
          return {
            username: username,
            password: password
          };
        });
      },

      validate(request, session) {
        return isValid(session.username, session.password);
      }
    });

    function isValid(username, password) {
      return initialized.then(function () {
        let hash = users.get(username);
        if (hash == null || !htpasswd.verify(hash, password)) return Promise.reject(false);
        return Promise.resolve(true);
      });
    }
  }
});