const Promise = require('bluebird');
const _ = require('lodash');
const chainRunnerFn = require('../handlers/chain_runner.js');
const timelionDefaults = require('../lib/get_namespaced_settings')();

function replyWithError(e, reply) {
  reply({title: e.toString(), message: e.toString(), stack: e.stack}).code(400);
}


module.exports = (server) => {

  server.route({
    method: ['POST', 'GET'],
    path: '/api/timelion/run',
    handler: (request, reply) => {

      // I don't really like this, but we need to get all of the settings
      // before every request. This just sucks because its going to slow things
      // down. Meh.
      return server.uiSettings().getAll().then((uiSettings) => {
        let sheet;
        const tlConfig = require('../handlers/lib/tl_config.js')({
          server: server,
          request: request,
          settings: _.defaults(uiSettings, timelionDefaults) // Just in case they delete some setting.
        });
        const chainRunner = chainRunnerFn(tlConfig);

        try {
          sheet = chainRunner.processRequest(request.payload || {
            sheet: [request.query.expression],
            time: {
              from: request.query.from,
              to: request.query.to,
              interval: request.query.interval,
              timezone: request.query.timezone
            }
          });
        } catch (e) {
          replyWithError(e, reply);
          return;
        }

        return Promise.all(sheet).then((sheet) => {
          const response = {
            sheet: sheet,
            stats: chainRunner.getStats()
          };
          reply(response);
        }).catch((e) => {
          // TODO Maybe we should just replace everywhere we throw with Boom? Probably.
          if (e.isBoom) {
            reply(e);
          } else {
            replyWithError(e, reply);
          }
        });
      });


    }
  });

};
