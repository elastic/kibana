/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { format as formatUrl } from 'url';
import { esTestConfig, kbnTestConfig, kibanaServerTestUser } from '@kbn/test';

export default function () {
  const servers = {
    kibana: kbnTestConfig.getUrlParts(),
    elasticsearch: esTestConfig.getUrlParts(),
  };

  return {
    servers,

    esTestCluster: {
      serverArgs: ['xpack.security.enabled=false'],
    },

    kbnTestServer: {
      buildArgs: [],
      sourceArgs: ['--no-base-path', '--env.name=development'],
      serverArgs: [
        `--server.port=${kbnTestConfig.getPort()}`,
        `--server.prototypeHardening=true`,
        '--status.allowAnonymous=true',
        // We shouldn't embed credentials into the URL since Kibana requests to Elasticsearch should
        // either include `kibanaServerTestUser` credentials, or credentials provided by the test
        // user, or none at all in case anonymous access is used.
        `--elasticsearch.hosts=${formatUrl(
          Object.fromEntries(
            Object.entries(servers.elasticsearch).filter(([key]) => key.toLowerCase() !== 'auth')
          )
        )}`,
        `--elasticsearch.username=${kibanaServerTestUser.username}`,
        `--elasticsearch.password=${kibanaServerTestUser.password}`,
        // Needed for async search functional tests to introduce a delay
        `--data.search.aggs.shardDelay.enabled=true`,
        `--data.query.timefilter.minRefreshInterval=1000`,
        `--security.showInsecureClusterWarning=false`,
        '--telemetry.banner=false',
        '--telemetry.optIn=false',
        // These are *very* important to have them pointing to staging
        '--telemetry.sendUsageTo=staging',
        `--server.maxPayload=1679958`,
        // newsfeed mock service
        `--plugin-path=${path.join(__dirname, 'plugins', 'newsfeed')}`,
        // otel mock service
        `--plugin-path=${path.join(__dirname, 'plugins', 'otel_metrics')}`,
        `--newsfeed.service.urlRoot=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`,
        `--newsfeed.service.pathTemplate=/api/_newsfeed-FTS-external-service-simulators/kibana/v{VERSION}.json`,
        `--logging.appenders.deprecation=${JSON.stringify({
          type: 'console',
          layout: {
            type: 'json',
          },
        })}`,
        `--logging.loggers=${JSON.stringify([
          {
            name: 'elasticsearch.deprecation',
            level: 'all',
            appenders: ['deprecation'],
          },
        ])}`,
        // Add meta info to the logs so FTR logs are more actionable
        `--logging.appenders.default=${JSON.stringify({
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '[%date][%level][%logger] %message %meta',
          },
        })}`,
        `--logging.appenders.console=${JSON.stringify({
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: '[%date][%level][%logger] %message %meta',
          },
        })}`,
      ],
    },
  };
}
