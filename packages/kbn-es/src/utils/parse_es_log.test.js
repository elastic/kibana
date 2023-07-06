/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const dedent = require('dedent');
const { parseEsLog, parseEsDockerLog } = require('./parse_es_log');

describe('parseEsLog', () => {
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

  test('parses data containing exception', () => {
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
});

describe('parseEsDockerLog', () => {
  test('parses single line', () => {
    const data = dedent(`
    {"@timestamp":"2023-07-05T20:47:18.999Z", "log.level": "INFO", "message":"The current build is a snapshot, feature flag [query_rules] is enabled", "ecs.version": "1.2.0","service.name":"ES_ECS","event.dataset":"elasticsearch.server","process.thread.name":"main","log.logger":"org.elasticsearch.common.util.FeatureFlag","elasticsearch.node.name":"4ff50cc2bea1","elasticsearch.cluster.name":"docker-cluster"}
    `);

    const lines = parseEsDockerLog(data);
    expect(lines).toHaveLength(1);
    expect(lines[0].message).toMatchSnapshot();
  });

  test('parses multiple line', () => {
    const data = dedent(`
    {"@timestamp":"2023-07-05T20:47:18.999Z", "log.level": "INFO", "message":"The current build is a snapshot, feature flag [query_rules] is enabled", "ecs.version": "1.2.0","service.name":"ES_ECS","event.dataset":"elasticsearch.server","process.thread.name":"main","log.logger":"org.elasticsearch.common.util.FeatureFlag","elasticsearch.node.name":"4ff50cc2bea1","elasticsearch.cluster.name":"docker-cluster"}
    {"@timestamp":"2023-07-05T20:47:18.225Z", "log.level": "INFO", "message":"JVM arguments [-Des.networkaddress.cache.ttl=60, -Des.networkaddress.cache.negative.ttl=10, -Djava.security.manager=allow, -XX:+AlwaysPreTouch, -Xss1m, -Djava.awt.headless=true, -Dfile.encoding=UTF-8, -Djna.nosys=true, -XX:-OmitStackTraceInFastThrow, -Dio.netty.noUnsafe=true, -Dio.netty.noKeySetOptimization=true, -Dio.netty.recycler.maxCapacityPerThread=0, -Dlog4j.shutdownHookEnabled=false, -Dlog4j2.disable.jmx=true, -Dlog4j2.formatMsgNoLookups=true, -Djava.locale.providers=SPI,COMPAT, --add-opens=java.base/java.io=org.elasticsearch.preallocate, -Des.cgroups.hierarchy.override=/, -XX:+UseG1GC, -Djava.io.tmpdir=/tmp/elasticsearch-6398256883002408259, --add-modules=jdk.incubator.vector, -XX:+HeapDumpOnOutOfMemoryError, -XX:+ExitOnOutOfMemoryError, -XX:HeapDumpPath=data, -XX:ErrorFile=logs/hs_err_pid%p.log, -Xlog:gc*,gc+age=trace,safepoint:file=logs/gc.log:utctime,level,pid,tags:filecount=32,filesize=64m, -Des.serverless_transport=true, -Xms7928m, -Xmx7928m, -XX:MaxDirectMemorySize=4156555264, -XX:G1HeapRegionSize=4m, -XX:InitiatingHeapOccupancyPercent=30, -XX:G1ReservePercent=15, -Des.distribution.type=docker, --module-path=/usr/share/elasticsearch/lib, --add-modules=jdk.net, --add-modules=org.elasticsearch.preallocate, -Djdk.module.main=org.elasticsearch.server]", "ecs.version": "1.2.0","service.name":"ES_ECS","event.dataset":"elasticsearch.server","process.thread.name":"main","log.logger":"org.elasticsearch.node.Node","elasticsearch.node.name":"4ff50cc2bea1","elasticsearch.cluster.name":"docker-cluster"}
    `);

    const lines = parseEsDockerLog(data);
    expect(lines).toHaveLength(2);
    expect(lines[0].message).toMatchSnapshot();
    expect(lines[1].message).toMatchSnapshot();
  });

  test('parses json with nested brackets', () => {
    const data = dedent(`
    {"@timestamp":"2023-07-05T23:47:37.164Z", "log.level": "INFO", "message":"Node [{c468318b091c}{26kYJn8jQt2MDYMEj_6Duw}] is selected as the current health node.", "ecs.version": "1.2.0","service.name":"ES_ECS","event.dataset":"elasticsearch.server","process.thread.name":"elasticsearch[c468318b091c][management][T#2]","log.logger":"org.elasticsearch.health.node.selection.HealthNodeTaskExecutor","elasticsearch.cluster.uuid":"tvAKFE9sQueCwIXZJDq7LA","elasticsearch.node.id":"26kYJn8jQt2MDYMEj_6Duw","elasticsearch.node.name":"c468318b091c","elasticsearch.cluster.name":"docker-cluster"}
    `);

    const lines = parseEsDockerLog(data);
    expect(lines).toHaveLength(1);
    expect(lines[0].message).toMatchSnapshot();
  });
});
