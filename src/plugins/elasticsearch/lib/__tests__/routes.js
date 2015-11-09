var src = require('requirefrom')('src');
var expect = require('expect.js');
var util = require('util');
var format = util.format;

var KbnServer = src('server/KbnServer');
var fromRoot = src('utils/fromRoot');

describe('plugins/elasticsearch', function () {
  describe('routes', function () {

    var kbnServer;

    before(function () {
      kbnServer = new KbnServer({
        server: {
          autoListen: false,
          xsrf: {
            disableProtection: true
          }
        },
        logging: { quiet: true },
        plugins: {
          scanDirs: [
            fromRoot('src/plugins')
          ]
        },
        optimize: {
          enabled: false
        }
      });

      return kbnServer.ready();
    });


    after(function () {
      return kbnServer.close();
    });


    function testRoute(options) {
      if (typeof options.payload === 'object') {
        options.payload = JSON.stringify(options.payload);
      }

      var statusCode = options.statusCode || 200;
      describe(format('%s %s', options.method, options.url), function () {
        it('should should return ' + statusCode, function (done) {
          kbnServer.server.inject(options, function (res) {
            try {
              expect(res.statusCode).to.be(statusCode);
              done();
            } catch (e) {
              done(e);
            }
          });
        });
      });
    }


    testRoute({
      method: 'GET',
      url: '/elasticsearch/_nodes'
    });

    testRoute({
      method: 'GET',
      url: '/elasticsearch/'
    });

    testRoute({
      method: 'POST',
      url: '/elasticsearch/.kibana',
      payload: {settings: { number_of_shards: 1, number_of_replicas: 1 }},
      statusCode: 200
    });

    testRoute({
      method: 'GET',
      url: '/elasticsearch/.kibana'
    });

    testRoute({
      method: 'POST',
      url: '/elasticsearch/.kibana/_bulk',
      payload: '{}',
      statusCode: 400
    });

    testRoute({
      method: 'POST',
      url: '/elasticsearch/.kibana/__kibanaQueryValidator/_validate/query?explain=true&ignore_unavailable=true',
      payload: {query: {query_string: {analyze_wildcard: true, query: '*'}}}
    });

    testRoute({
      method: 'POST',
      url: '/elasticsearch/_mget?timeout=0&ignore_unavailable=true&preference=1429574531063',
      payload: {docs: [{_index: '.kibana', _type: 'index-pattern', _id: '[logstash-]YYYY.MM.DD'}]}
    });

    testRoute({
      method: 'POST',
      url: '/elasticsearch/_msearch?timeout=0&ignore_unavailable=true&preference=1429577952339',
      payload: '{"index":"logstash-2015.04.21","ignore_unavailable":true}\n{"size":500,"sort":{"@timestamp":"desc"},"query":{"filtered":{"query":{"query_string":{"analyze_wildcard":true,"query":"*"}},"filter":{"bool":{"must":[{"range":{"@timestamp":{"gte":1429577068175,"lte":1429577968175}}}],"must_not":[]}}}},"highlight":{"pre_tags":["@kibana-highlighted-field@"],"post_tags":["@/kibana-highlighted-field@"],"fields":{"*":{}}},"aggs":{"2":{"date_histogram":{"field":"@timestamp","interval":"30s","pre_zone":"-07:00","pre_zone_adjust_large_interval":true,"min_doc_count":0,"extended_bounds":{"min":1429577068175,"max":1429577968175}}}},"fields":["*","_source"],"script_fields":{},"fielddata_fields":["timestamp_offset","@timestamp","utc_time"]}\n' // eslint-disable-line max-len
    });

  });
});
