/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EcsBase,
  EcsAs as EcsAutonomousSystem,
  EcsClient,
  EcsCloud,
  EcsContainer,
  EcsDestination,
  EcsDns,
  EcsError,
  EcsEvent,
  EcsFile,
  EcsGroup,
  EcsHost,
  EcsHttp,
  EcsLog,
  EcsNetwork,
  EcsObserver,
  EcsOrganization,
  EcsPackage,
  EcsProcess,
  EcsRegistry,
  EcsRelated,
  EcsRule,
  EcsServer,
  EcsService,
  EcsSource,
  EcsThreat,
  EcsTls,
  EcsTracing,
  EcsUrl,
  EcsUser,
  EcsUserAgent,
  EcsVulnerability,
  EcsAgent,
} from '@elastic/ecs';

/**
 * Represents the ECS schema with the following reserved keys excluded:
 * - `ecs`
 * - `@timestamp`
 * - `message`
 * - `log.level`
 * - `log.logger`
 *
 * @public
 */
export type LogMeta = Omit<EcsBase, '@timestamp' | 'message'> &
  EcsTracing & {
    agent?: EcsAgent;
    as?: EcsAutonomousSystem;
    client?: EcsClient;
    cloud?: EcsCloud;
    container?: EcsContainer;
    destination?: EcsDestination;
    dns?: EcsDns;
    error?: EcsError;
    event?: EcsEvent;
    file?: EcsFile;
    group?: EcsGroup;
    host?: EcsHost;
    http?: EcsHttp;
    log?: Omit<EcsLog, 'level' | 'logger'>;
    network?: EcsNetwork;
    observer?: EcsObserver;
    organization?: EcsOrganization;
    package?: EcsPackage;
    process?: EcsProcess;
    registry?: EcsRegistry;
    related?: EcsRelated;
    rule?: EcsRule;
    server?: EcsServer;
    service?: EcsService;
    source?: EcsSource;
    threat?: EcsThreat;
    tls?: EcsTls;
    url?: EcsUrl;
    user?: EcsUser;
    user_agent?: EcsUserAgent;
    vulnerability?: EcsVulnerability;
  };
