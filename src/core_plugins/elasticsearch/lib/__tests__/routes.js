import { format } from 'util';

import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { esTestCluster } from '../../../../test_utils/es';

describe('plugins/elasticsearch', function () {
  describe('routes', function () {
    let kbnServer;
    const es = esTestCluster.use({
      name: 'core_plugins/es/routes',
    });

    before(async function () {
      this.timeout(es.getStartTimeout());
      await es.start();

      kbnServer = kbnTestServer.createServerWithCorePlugins();
      await kbnServer.ready();
      await kbnServer.server.plugins.elasticsearch.waitUntilReady();
    });

    after(async function () {
      await kbnServer.close();
      await es.stop();
    });

    function testRoute(options, statusCode = 200) {
      if (typeof options.payload === 'object') {
        options.payload = JSON.stringify(options.payload);
      }

      describe(format('%s %s', options.method, options.url), function () {
        it('should return ' + statusCode, function (done) {
          kbnTestServer.makeRequest(kbnServer, options, function (res) {
            if (res.statusCode === statusCode) {
              done();
              return;
            }

            done(new Error(`
              Invalid response code from elasticseach:
                ${res.statusCode} should be ${statusCode}

              Response:
                ${res.payload}
            `));
          });
        });
      });
    }

    testRoute({
      method: 'GET',
      url: '/elasticsearch/_nodes'
    }, 404);

    testRoute({
      method: 'GET',
      url: '/elasticsearch'
    }, 404);

    testRoute({
      method: 'POST',
      url: '/elasticsearch/.kibana'
    }, 404);

    testRoute({
      method: 'PUT',
      url: '/elasticsearch/.kibana'
    }, 404);

    testRoute({
      method: 'DELETE',
      url: '/elasticsearch/.kibana'
    }, 404);

    testRoute({
      method: 'GET',
      url: '/elasticsearch/.kibana'
    }, 404);

    testRoute({
      method: 'POST',
      url: '/elasticsearch/.kibana/_bulk',
      payload: '{}'
    }, 404);

    testRoute({
      method: 'POST',
      url: '/elasticsearch/.kibana/__kibanaQueryValidator/_validate/query?explain=true&ignore_unavailable=true',
      headers: {
        'content-type': 'application/json'
      },
      payload: { query: { query_string: { analyze_wildcard: true, query: '*' } } }
    }, 404);

    testRoute({
      method: 'POST',
      url: '/elasticsearch/_mget',
      headers: {
        'content-type': 'application/json'
      },
      payload: { docs: [{ _index: '.kibana', _type: 'index-pattern', _id: '[logstash-]YYYY.MM.DD' }] }
    }, 404);

    testRoute({
      method: 'POST',
      url: '/elasticsearch/_msearch',
      headers: {
        'content-type': 'application/json'
      },
      payload: '{"index":"logstash-2015.04.21","ignore_unavailable":true}\n{"size":500,"sort":{"@timestamp":"desc"},"query":{"bool":{"must":[{"query_string":{"analyze_wildcard":true,"query":"*"}},{"bool":{"must":[{"range":{"@timestamp":{"gte":1429577068175,"lte":1429577968175}}}],"must_not":[]}}],"must_not":[]}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"30s","min_doc_count":0,"extended_bounds":{"min":1429577068175,"max":1429577968175}}}},"stored_fields":["*"],"_source": true,"script_fields":{},"docvalue_fields":["timestamp_offset","@timestamp","utc_time"]}\n' // eslint-disable-line max-len
    });

  });
});
