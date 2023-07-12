/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import getopts from 'getopts';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';

import { Cluster } from '../cluster';
import { parseTimeoutToMs, DEFAULT_DOCKER_CMD, DEFAULT_DOCKER_IMG } from '../utils';
import { Command } from './types';

/*
rm -rf /tmp/objectstore ; mkdir /tmp/objectstore ; chmod a+rw -R /tmp/objectstore

docker network create elastic

docker run --rm -d --name es01 --net elastic -p 9200:9200 -p 9300:9300 -e ES_JAVA_OPTS="-Xms1g -Xmx1g" -e node.name=es01 -e cluster.initial_master_nodes=es01,es02,es03 -e discovery.seed_hosts=es02,es03 -e node.roles='["master","index"]' -e xpack.security.enabled=false -e cluster.name=stateless -e stateless.enabled=true -e xpack.searchable.snapshot.shared_cache.size=1gb -e stateless.object_store.type=fs -e stateless.object_store.bucket=stateless -e path.repo=/objectstore -v /tmp/objectstore:/objectstore:z docker.elastic.co/elasticsearch-ci/elasticsearch-serverless

docker run --rm -d --name es02 --net elastic -p 9202:9202 -p 9302:9302 -e ES_JAVA_OPTS="-Xms1g -Xmx1g" -e node.name=es02 -e cluster.initial_master_nodes=es01,es02,es03 -e discovery.seed_hosts=es01,es03 -e node.roles='["master","search"]' -e xpack.security.enabled=false -e cluster.name=stateless -e stateless.enabled=true -e xpack.searchable.snapshot.shared_cache.size=1gb -e stateless.object_store.type=fs -e stateless.object_store.bucket=stateless -e path.repo=/objectstore -v /tmp/objectstore:/objectstore:z docker.elastic.co/elasticsearch-ci/elasticsearch-serverless

docker run --rm -d --name es03 --net elastic -p 9203:9203 -p 9303:9303 -e ES_JAVA_OPTS="-Xms1g -Xmx1g" -e node.name=es03 -e cluster.initial_master_nodes=es01,es02,es03 -e discovery.seed_hosts=es01,es02 -e node.roles='["master"]' -e xpack.security.enabled=false -e cluster.name=stateless -e stateless.enabled=true -e stateless.object_store.type=fs -e stateless.object_store.bucket=stateless -e path.repo=/objectstore -v /tmp/objectstore:/objectstore:z docker.elastic.co/elasticsearch-ci/elasticsearch-serverless

*/

export const docker: Command = {
  description: 'Run an Elasticsearch Docker image',
  usage: 'es docker [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    const { version, password } = defaults;

    // TODO: enrollment token + env params?
    // TODO: private registry?
    // TODO: docker-compose
    // TODO: check docker installed
    // TODO: get image name by version number? snapshot or release?
    // TODO: add serverless flag
    // TODO: parse docker logs
    // TODO: tests
    // TODO: docs?
    // TODO: validate img
    // TODO: network?
    // TODO: restart last container?
    // TODO: data archive
    return dedent`
    Options:

      --version           Version of ES to run [default: ${version}]
      --image             Full path to image of ES to run [default: ${DEFAULT_DOCKER_IMG}]. Has precedence over version.
      --password          Sets password for elastic user [default: ${password}]
      --password.[user]   Sets password for native realm user [default: ${password}]
      -E                  Additional key=value settings to pass to Elasticsearch 
      -D                  Single quoted command to pass to Docker [default: ${DEFAULT_DOCKER_CMD}]
      --ssl               Sets up SSL on Elasticsearch
      --skip-ready-check  Disable the ready check
      --ready-timeout     Customize the ready check timeout, in seconds or "Xm" format, defaults to 1m

    Examples:

      es docker --version ${version}
      es docker --image docker.elastic.co/elasticsearch/elasticsearch:8.10.0-759b2cb2-SNAPSHOT-amd64
      es docker -D 'start 4e79be040f6aca5c433f73faa60fe245791482c2a1abda9417a505ec552cb9a5' 
    `;
  },
  run: async (defaults = {}) => {
    const runStartTime = Date.now();
    const log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
    const reportTime = getTimeReporter(log, 'scripts/es docker');

    const argv = process.argv.slice(2);
    const options = getopts(argv, {
      alias: {
        esArgs: 'E',
        dockerCmd: 'D',
        skipReadyCheck: 'skip-ready-check',
        readyTimeout: 'ready-timeout',
      },

      string: ['version', 'ready-timeout', 'D'],
      boolean: ['skip-ready-check'],

      default: defaults,
    });

    const pullStartTime = Date.now();
    reportTime(pullStartTime, 'pulled', {
      success: true,
      ...options,
    });

    const cluster = new Cluster({ ssl: options.ssl });
    await cluster.runDocker({
      reportTime,
      startTime: runStartTime,
      ...options,
      readyTimeout: parseTimeoutToMs(options.readyTimeout),
    });
  },
};
