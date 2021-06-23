/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsBase } from './ecs/base';

import { EcsAgent } from './ecs/agent';
import { EcsAutonomousSystem } from './ecs/autonomous_system';
import { EcsClient } from './ecs/client';
import { EcsCloud } from './ecs/cloud';
import { EcsContainer } from './ecs/container';
import { EcsDestination } from './ecs/destination';
import { EcsDns } from './ecs/dns';
import { EcsError } from './ecs/error';
import { EcsEvent } from './ecs/event';
import { EcsFile } from './ecs/file';
import { EcsGroup } from './ecs/group';
import { EcsHost } from './ecs/host';
import { EcsHttp } from './ecs/http';
import { EcsLog } from './ecs/log';
import { EcsNetwork } from './ecs/network';
import { EcsObserver } from './ecs/observer';
import { EcsOrganization } from './ecs/organization';
import { EcsPackage } from './ecs/package';
import { EcsProcess } from './ecs/process';
import { EcsRegistry } from './ecs/registry';
import { EcsRelated } from './ecs/related';
import { EcsRule } from './ecs/rule';
import { EcsServer } from './ecs/server';
import { EcsService } from './ecs/service';
import { EcsSource } from './ecs/source';
import { EcsThreat } from './ecs/threat';
import { EcsTls } from './ecs/tls';
import { EcsTracing } from './ecs/tracing';
import { EcsUrl } from './ecs/url';
import { EcsUser } from './ecs/user';
import { EcsUserAgent } from './ecs/user_agent';
import { EcsVulnerability } from './ecs/vulnerability';

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
