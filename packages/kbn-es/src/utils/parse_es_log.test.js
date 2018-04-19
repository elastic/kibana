const dedent = require('dedent');
const { parseEsLog } = require('./parse_es_log');

test('parses single line', () => {
  const data = dedent(`
    [2018-02-23T10:13:40,371][INFO ][o.e.p.PluginsService     ] [qEfPPg8] loaded module [lang-expression]
  `);

  const lines = parseEsLog(data);
  expect(lines).toHaveLength(1);
  expect(lines[0].message).toMatchSnapshot();
});

test('parses multiple lines', () => {
  const data = dedent(`
    [2018-02-23T10:13:40,405][INFO ][o.e.p.PluginsService     ] [qEfPPg8] loaded plugin [x-pack-security]
    [2018-02-23T10:13:40,405][INFO ][o.e.p.PluginsService     ] [qEfPPg8] loaded plugin [x-pack-watcher]
  `);

  const lines = parseEsLog(data);
  expect(lines).toHaveLength(2);
  expect(lines[0].message).toMatchSnapshot();
  expect(lines[1].message).toMatchSnapshot();
});

test('parses data containing execption', () => {
  const data = dedent(`
    [2018-02-23T10:13:45,646][INFO ][o.e.n.Node               ] [qEfPPg8] starting ...
    [2018-02-23T10:13:53,992][WARN ][o.e.b.ElasticsearchUncaughtExceptionHandler] [] uncaught exception in thread [main]
    org.elasticsearch.bootstrap.StartupException: BindHttpException; nested: BindException[Address already in use];
      at org.elasticsearch.bootstrap.Elasticsearch.init(Elasticsearch.java:125) ~[elasticsearch-7.0.0.jar:7.0.0-alpha1-SNAPSHOT]
    Caused by: org.elasticsearch.http.BindHttpException: Failed to bind to [9200]
      at org.elasticsearch.http.netty4.Netty4HttpServerTransport.bindAddress(Netty4HttpServerTransport.java:408) ~[?:?]
      at org.elasticsearch.http.netty4.Netty4HttpServerTransport.createBoundHttpAddress(Netty4HttpServerTransport.java:309) ~[?:?]
      ... 13 more
    Caused by: java.net.BindException: Address already in use
      at sun.nio.ch.Net.bind0(Native Method) ~[?:?]
      at java.lang.Thread.run(Thread.java:844) [?:?]
    [2018-02-23T10:13:54,280][INFO ][o.e.g.GatewayService     ] [qEfPPg8] recovered [0] indices into cluster_state
  `);

  const lines = parseEsLog(data);
  expect(lines).toHaveLength(3);
  expect(lines[0].message).toMatchSnapshot();
  expect(lines[1].message).toMatchSnapshot();
  expect(lines[2].message).toMatchSnapshot();
});

test('handles parsing exception', () => {
  const lines = parseEsLog('foo');

  expect(lines).toHaveLength(1);
  expect(lines[0].message).toBe('foo');
});
