/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { format as formatUrl } from 'url';

import {
  MOCK_IDP_ENTITY_ID,
  MOCK_IDP_ATTRIBUTE_PRINCIPAL,
  MOCK_IDP_ATTRIBUTE_ROLES,
  MOCK_IDP_ATTRIBUTE_EMAIL,
  MOCK_IDP_ATTRIBUTE_NAME,
} from '@kbn/mock-idp-utils';
import { fleetPackageRegistryDockerImage, defineDockerServersConfig } from '@kbn/test';
import path from 'path';
import { MOCK_IDP_REALM_NAME } from '@kbn/mock-idp-utils';
import { REPO_ROOT } from '@kbn/repo-info';
import { STATEFUL_ROLES_ROOT_PATH } from '@kbn/es';
import type { ScoutServerConfig } from '../../types';
import { SAML_IDP_PLUGIN_PATH, STATEFUL_IDP_METADATA_PATH } from '../constants';

const packageRegistryConfig = join(__dirname, './package_registry_config.yml');
const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

/**
 * This is used by CI to set the docker registry port
 * you can also define this environment variable locally when running tests which
 * will spin up a local docker package registry locally for you
 * if this is defined it takes precedence over the `packageRegistryOverride` variable
 */
const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

// if config is executed on CI or locally
const isRunOnCI = process.env.CI;

const servers = {
  elasticsearch: {
    protocol: 'http',
    hostname: 'localhost',
    port: 9220,
    username: 'kibana_system',
    password: 'changeme',
  },
  kibana: {
    protocol: 'http',
    hostname: 'localhost',
    port: 5620,
    username: 'elastic',
    password: 'changeme',
  },
};

const kbnUrl = `${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`;

export const defaultConfig: ScoutServerConfig = {
  servers,
  dockerServers: defineDockerServersConfig({
    registry: {
      enabled: !!dockerRegistryPort,
      image: fleetPackageRegistryDockerImage,
      portInContainer: 8080,
      port: dockerRegistryPort,
      args: dockerArgs,
      waitForLogLine: 'package manifests loaded',
      waitForLogLineTimeoutMs: 60 * 2 * 1000, // 2 minutes
    },
  }),
  esTestCluster: {
    from: 'snapshot',
    license: 'trial',
    files: [
      // Passing the roles that are equivalent to the ones we have in serverless
      path.resolve(REPO_ROOT, STATEFUL_ROLES_ROOT_PATH, 'roles.yml'),
    ],
    serverArgs: [
      'path.repo=/tmp/',
      'path.repo=/tmp/repo,/tmp/repo_1,/tmp/repo_2,/tmp/cloud-snapshots/',
      'node.attr.name=apiIntegrationTestNode',
      'xpack.security.authc.api_key.enabled=true',
      'xpack.security.authc.token.enabled=true',
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.order=0`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.metadata.path=${STATEFUL_IDP_METADATA_PATH}`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.idp.entity_id=${MOCK_IDP_ENTITY_ID}`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.entity_id=${kbnUrl}`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.acs=${kbnUrl}/api/security/saml/callback`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.sp.logout=${kbnUrl}/logout`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.principal=${MOCK_IDP_ATTRIBUTE_PRINCIPAL}`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.groups=${MOCK_IDP_ATTRIBUTE_ROLES}`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.name=${MOCK_IDP_ATTRIBUTE_NAME}`,
      `xpack.security.authc.realms.saml.${MOCK_IDP_REALM_NAME}.attributes.mail=${MOCK_IDP_ATTRIBUTE_EMAIL}`,
    ],
    ssl: false,
  },
  kbnTestServer: {
    buildArgs: [],
    env: {},
    sourceArgs: ['--no-base-path', '--env.name=development'],
    serverArgs: [
      `--server.port=${servers.kibana.port}`,
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
      `--elasticsearch.username=${servers.elasticsearch.username}`,
      `--elasticsearch.password=${servers.elasticsearch.password}`,
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
      `--plugin-path=${path.join(REPO_ROOT, 'test', 'common', 'plugins', 'newsfeed')}`,
      // otel mock service
      `--plugin-path=${path.join(REPO_ROOT, 'test', 'common', 'plugins', 'otel_metrics')}`,
      `--newsfeed.service.urlRoot=${kbnUrl}`,
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
      // x-pack/test/functional/config.base.js
      '--status.allowAnonymous=true',
      '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
      '--xpack.maps.showMapsInspectorAdapter=true',
      '--xpack.maps.preserveDrawingBuffer=true',
      '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"', // server restarts should not invalidate active sessions
      '--xpack.encryptedSavedObjects.encryptionKey="DkdXazszSCYexXqz4YktBGHCRkV6hyNK"',
      '--xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled=true',
      '--savedObjects.maxImportPayloadBytes=10485760', // for OSS test management/_import_objects,
      '--savedObjects.allowHttpApiAccess=false', // override default to not allow hiddenFromHttpApis saved objects access to the http APIs see https://github.com/elastic/dev/issues/2200
      // explicitly disable internal API restriction. See https://github.com/elastic/kibana/issues/163654
      '--server.restrictInternalApis=false',
      // disable fleet task that writes to metrics.fleet_server.* data streams, impacting functional tests
      `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify(['Fleet-Metrics-Task'])}`,
      // x-pack/test/api_integration/config.ts
      '--xpack.security.session.idleTimeout=3600000', // 1 hour
      '--telemetry.optIn=true',
      '--xpack.fleet.agents.pollingRequestTimeout=5000', // 5 seconds
      '--xpack.ruleRegistry.write.enabled=true',
      '--xpack.ruleRegistry.write.enabled=true',
      '--xpack.ruleRegistry.write.cache.enabled=false',
      '--monitoring_collection.opentelemetry.metrics.prometheus.enabled=true',
      // SAML configuration
      ...(isRunOnCI ? [] : ['--mock_idp_plugin.enabled=true']),
      // This ensures that we register the Security SAML API endpoints.
      // In the real world the SAML config is injected by control plane.
      `--plugin-path=${SAML_IDP_PLUGIN_PATH}`,
      '--xpack.cloud.id=ftr_fake_cloud_id',
      // Ensure that SAML is used as the default authentication method whenever a user navigates to Kibana. In other
      // words, Kibana should attempt to authenticate the user using the provider with the lowest order if the Login
      // Selector is disabled (replicating Serverless configuration). By declaring `cloud-basic` with a higher
      // order, we indicate that basic authentication can still be used, but only if explicitly requested when the
      // user navigates to `/login` page directly and enters username and password in the login form.
      '--xpack.security.authc.selector.enabled=false',
      `--xpack.security.authc.providers=${JSON.stringify({
        saml: { 'cloud-saml-kibana': { order: 0, realm: MOCK_IDP_REALM_NAME } },
        basic: { 'cloud-basic': { order: 1 } },
      })}`,
      `--server.publicBaseUrl=${kbnUrl}`,
    ],
  },
};
