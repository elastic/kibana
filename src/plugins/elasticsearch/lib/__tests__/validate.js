var _ = require('lodash');
var expect = require('expect.js');
var src = require('requirefrom')('src');

var fromRoot = src('utils/fromRoot');
var KbnServer = src('server/KbnServer');
var validateRequest = require('../validate');


describe('plugins/elasticsearch', function () {
  var kbnServer;
  var server;
  var config;

  before(function () {
    kbnServer = new KbnServer({
      server: { autoListen: false },
      plugins: { scanDirs: [ fromRoot('src/plugins') ] },
      logging: { quiet: true },
      optimize: { enabled: false }
    });

    return kbnServer.ready()
    .then(function () {
      server = kbnServer.server;
      config = kbnServer.config;
    });
  });

  after(function () {
    kbnServer.close();
  });

  describe('lib/validate', function () {

    function del(path, body, valid) {
      run('delEte', path, body, valid);
      run('delete', path, body, valid);
    }

    function send(path, body, valid) {
      run('POST', path, body, valid);
      run('post', path, body, valid);
      run('PUT', path, body, valid);
      run('put', path, body, valid);
    }

    function run(method, path, body, valid) {
      if (typeof body === 'boolean') {
        valid = body;
        body = null;
      }

      if (_.isArray(body)) body = body.map(JSON.stringify).join('\n') + '\n';
      if (_.isObject(body)) body = JSON.stringify(body);

      var pass = false;
      try {
        validateRequest(server, {
          method: method.toLowerCase(),
          path: path,
          payload: body
        });
        pass = true;
      } catch (e) {} // eslint-disable-line no-empty

      if (pass !== Boolean(valid)) {
        var msg = 'Expected ' + method + ' ' +
          path + ' ' + (body ? 'with body ' : '') +
          'to ' + (!valid ? 'not ' : '') + 'validate';

        if (body) {
          msg += ' – ' + body;
        }

        throw new Error(msg);
      }
    }

    describe('index management', function () {
      it('allows creating kibana index', function () {
        send('/' + config.get('kibana.index'), true);
      });

      it('allows deleting the kibana index', function () {
        del('/' + config.get('kibana.index'), true);
      });

      it('blocks creating a non-kibana index', function () {
        send('/app-index', false);
      });

      it('blocks deleting a non-kibana indices', function () {
        del('/app-data', false);
      });
    });

    describe('doc management', function () {
      it('allows indexing to the kibana index', function () {
        send('/' + config.get('kibana.index'), true);
        send('/' + config.get('kibana.index') + '/index-patterns', true);
        send('/' + config.get('kibana.index') + '/index-patterns/pattern-id', true);
      });

      it('allows deleting kibana documents', function () {
        del('/' + config.get('kibana.index') + '/index-patterns', true);
        del('/' + config.get('kibana.index') + '/index-patterns/pattern-id', true);
      });
    });

    describe('allows any destructive non-bulk requests against kibana index', function () {
      it('refresh', function () {
        send('/' + config.get('kibana.index') + '/_refresh', true);
      });

      it('delete', function () {
        del('/' + config.get('kibana.index') + '/pasta/lasagna', true);
      });
    });

    describe('assorted methods that are non-destructive', function () {
      it('validate', function () {
        run('GET', '/_search?search_type=count', true);
        run('GET', '/index/type/id', true);
        run('GET', '/index/type/_mapping/field/field1', true);
        run('GET', '/_aliases', true);
        run('GET', '/_nodes/', true);
        run('HEAD', '/', true);
        run('HEAD', '/' + config.get('kibana.index'), true);
        run('HEAD', '/other-index', true);
        run('GET', '/_cluster/health', true);
        run('POST', '/' + config.get('kibana.index') + '/__notRealIndex__/_validate/query?q=foo:bar', true);
        run('POST', '/_validate', true);
        run('POST', '/_search', true);
      });
    });

    describe('bulk indexing', function () {
      it('valid', function () {
        send('/_bulk', [
          { create: { _index: config.get('kibana.index'), _type: 'index-pattern' } },
          { fields: [] },
          { create: { _index: config.get('kibana.index'), _type: 'vis' } },
          { aggs: [] }
        ], true);

        send('/' + config.get('kibana.index') + '/_bulk', [
          // implicit index
          { create: { _type: 'index-pattern' } },
          { fields: [] },

          // explicit index
          { create: { _index: config.get('kibana.index'), _type: 'vis' } },
          { aggs: [] }

        ], true);
      });

      it('rejects bulks including even one other index', function () {
        send('/' + config.get('kibana.index') + '/_bulk', [
          // implicit index
          { create: { _type: 'index-pattern' } },
          { fields: [] },
          // explicit index
          { create: { _index: 'app-data', _type: 'vis' } },
          { aggs: [] }
        ], false);
      });

      it('rejects malformed bulk bodies', function () {
        send('/_bulk', '{}\n{ "_index": "john" }\n', false);
        send('/_bulk', '{}\n{}\n', false);
        send('/_bulk', '{ "field": "value" }', false);
        send('/_bulk', '{ "field": "v', false);
      });
    });

    describe('msearch', function () {
      it('requires a bulk-formatted body', function () {
        send('/_msearch', false);
        send('/_msearch', '{}', false);
        send('/_msearch', '{}\n{}\n', true);
        send('/_msearch', '{}\n{}\n{}\n', false);
      });

      it('allows searching any index', function () {
        send('/app-index/_msearch', [
          {},
          { query: { match_all: {} } }
        ], true);

        send('/app-index/data-type/_msearch', [
          {},
          { query: { match_all: {} } }
        ], true);

        send('/_msearch', [
          { _index: 'app-index', _type: 'data-type' },
          { query: { match_all: {} } },
          { _index: 'IT-index', _type: 'logs' },
          { query: { match_all: {} } },
          { _index: 'L33t', _type: '?' },
          { query: { match_all: {} } },
        ], true);
      });
    });

    describe('mget', function () {
      it('requires a valid json body', function () {
        send('/_mget', false);
        send('/_mget', '{}', true);
        send('/_mget', '{}\n{}\n', false);
      });

      it('allows reading from any index', function () {
        send('/app-index/_mget', { docs: { match_all: {} } }, true);
        send('/app-index/data-type/_mget', { docs: [ {} ] }, true);
      });
    });

  });
});
