/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type EcsBase,
  type EcsAs as EcsAutonomousSystem,
  type EcsClient,
  type EcsCloud,
  type EcsContainer,
  type EcsDestination,
  type EcsDns,
  type EcsError,
  type EcsEvent,
  type EcsFile,
  type EcsGroup,
  type EcsHost,
  type EcsHttp,
  type EcsLog,
  type EcsNetwork,
  type EcsObserver,
  type EcsOrganization,
  type EcsPackage,
  type EcsProcess,
  type EcsRegistry,
  type EcsRelated,
  type EcsRule,
  type EcsServer,
  type EcsService,
  type EcsSource,
  type EcsThreat,
  type EcsTls,
  type EcsTracing,
  type EcsUrl,
  type EcsUser,
  type EcsUserAgent,
  type EcsVulnerability,
  type EcsAgent,
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
