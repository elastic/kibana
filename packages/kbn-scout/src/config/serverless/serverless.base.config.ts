/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve, join } from 'path';
import { format as formatUrl } from 'url';
import Fs from 'fs';

import { CA_CERT_PATH, kibanaDevServiceAccount } from '@kbn/dev-utils';
import {
  fleetPackageRegistryDockerImage,
  defineDockerServersConfig,
  getDockerFileMountPath,
} from '@kbn/test';
import { MOCK_IDP_REALM_NAME } from '@kbn/mock-idp-utils';
import { REPO_ROOT } from '@kbn/repo-info';
import { ScoutServerConfig } from '../../types';
import { SAML_IDP_PLUGIN_PATH, SERVERLESS_IDP_METADATA_PATH, JWKS_PATH } from '../constants';

const packageRegistryConfig = join(__dirname, './package_registry_config.yml');
const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

/**
 * This is used by CI to set the docker registry port
 * you can also define this environment variable locally when running tests which
 * will spin up a local docker package registry locally for you
 * if this is defined it takes precedence over the `packageRegistryOverride` variable
 */
const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

const servers = {
  elasticsearch: {
    protocol: 'https',
    hostname: 'localhost',
    port: 9220,
    username: 'elastic_serverless',
    password: 'changeme',
    certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)],
  },
  kibana: {
    protocol: 'http',
    hostname: 'localhost',
    port: 5620,
    username: 'elastic_serverless',
    password: 'changeme',
  },
};

export const defaultConfig: ScoutServerConfig = {
  serverless: true,
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
    from: 'serverless',
    files: [SERVERLESS_IDP_METADATA_PATH, JWKS_PATH],
    serverArgs: [
      'xpack.security.authc.realms.file.file1.order=-100',
      `xpack.security.authc.realms.native.native1.enabled=false`,
      `xpack.security.authc.realms.native.native1.order=-97`,

      'xpack.security.authc.realms.jwt.jwt1.allowed_audiences=elasticsearch',
      `xpack.security.authc.realms.jwt.jwt1.allowed_issuer=https://kibana.elastic.co/jwt/`,
      `xpack.security.authc.realms.jwt.jwt1.allowed_signature_algorithms=[RS256]`,
      `xpack.security.authc.realms.jwt.jwt1.allowed_subjects=elastic-agent`,
      `xpack.security.authc.realms.jwt.jwt1.claims.principal=sub`,
      'xpack.security.authc.realms.jwt.jwt1.client_authentication.type=shared_secret',
      'xpack.security.authc.realms.jwt.jwt1.order=-98',
      `xpack.security.authc.realms.jwt.jwt1.pkc_jwkset_path=${getDockerFileMountPath(JWKS_PATH)}`,
      `xpack.security.authc.realms.jwt.jwt1.token_type=access_token`,
      'serverless.indices.validate_dot_prefixes=true',
      // controller cluster-settings
      `cluster.service.slow_task_logging_threshold=15s`,
      `cluster.service.slow_task_thread_dump_timeout=5s`,
      `serverless.search.enable_replicas_for_instant_failover=true`,
    ],
    ssl: true, // SSL is required for SAML realm
  },
  kbnTestServer: {
    buildArgs: [],
    env: {
      KBN_PATH_CONF: resolve(REPO_ROOT, 'config'),
    },
    sourceArgs: ['--no-base-path', '--env.name=development'],
    serverArgs: [
      `--server.restrictInternalApis=true`,
      `--server.port=${servers.kibana.port}`,
      `--server.prototypeHardening=true`,
      '--status.allowAnonymous=true',
      `--migrations.zdt.runOnRoles=${JSON.stringify(['ui'])}`,
      // We shouldn't embed credentials into the URL since Kibana requests to Elasticsearch should
      // either include `kibanaServerTestUser` credentials, or credentials provided by the test
      // user, or none at all in case anonymous access is used.
      `--elasticsearch.hosts=${formatUrl(
        Object.fromEntries(
          Object.entries(servers.elasticsearch).filter(([key]) => key.toLowerCase() !== 'auth')
        )
      )}`,
      `--elasticsearch.serviceAccountToken=${kibanaDevServiceAccount.token}`,
      `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
      '--telemetry.sendUsageTo=staging',
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
      // This ensures that we register the Security SAML API endpoints.
      // In the real world the SAML config is injected by control plane.
      `--plugin-path=${SAML_IDP_PLUGIN_PATH}`,
      '--xpack.cloud.base_url=https://fake-cloud.elastic.co',
      '--xpack.cloud.billing_url=/billing/overview/',
      '--xpack.cloud.deployments_url=/deployments',
      '--xpack.cloud.id=ftr_fake_cloud_id',
      '--xpack.cloud.organization_url=/account/',
      '--xpack.cloud.profile_url=/user/settings/',
      '--xpack.cloud.projects_url=/projects/',
      '--xpack.cloud.serverless.project_id=fakeprojectid',
      '--xpack.cloud.users_and_roles_url=/account/members/',
      // Ensure that SAML is used as the default authentication method whenever a user navigates to Kibana. In other
      // words, Kibana should attempt to authenticate the user using the provider with the lowest order if the Login
      // Selector is disabled (which is how Serverless Kibana is configured). By declaring `cloud-basic` with a higher
      // order, we indicate that basic authentication can still be used, but only if explicitly requested when the
      // user navigates to `/login` page directly and enters username and password in the login form.
      '--xpack.security.authc.selector.enabled=false',
      `--xpack.security.authc.providers=${JSON.stringify({
        saml: { 'cloud-saml-kibana': { order: 0, realm: MOCK_IDP_REALM_NAME } },
        basic: { 'cloud-basic': { order: 1 } },
      })}`,
      '--xpack.encryptedSavedObjects.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
      `--server.publicBaseUrl=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`,
      // configure security reponse header report-to settings to mimic MKI configuration
      `--csp.report_to=${JSON.stringify(['violations-endpoint'])}`,
      `--permissionsPolicy.report_to=${JSON.stringify(['violations-endpoint'])}`,
    ],
  },
};
