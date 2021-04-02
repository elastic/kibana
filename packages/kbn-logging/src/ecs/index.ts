/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsBase } from './base';
import { EcsField } from './ecs';

import { EcsAgent } from './agent';
import { EcsAutonomousSystem } from './autonomous_system';
import { EcsClient } from './client';
import { EcsCloud } from './cloud';
import { EcsContainer } from './container';
import { EcsDestination } from './destination';
import { EcsDns } from './dns';
import { EcsError } from './error';
import { EcsEvent } from './event';
import { EcsFile } from './file';
import { EcsGroup } from './group';
import { EcsHost } from './host';
import { EcsHttp } from './http';
import { EcsLog } from './log';
import { EcsNetwork } from './network';
import { EcsObserver } from './observer';
import { EcsOrganization } from './organization';
import { EcsPackage } from './package';
import { EcsProcess } from './process';
import { EcsRegistry } from './registry';
import { EcsRelated } from './related';
import { EcsRule } from './rule';
import { EcsServer } from './server';
import { EcsService } from './service';
import { EcsSource } from './source';
import { EcsThreat } from './threat';
import { EcsTls } from './tls';
import { EcsTracing } from './tracing';
import { EcsUrl } from './url';
import { EcsUser } from './user';
import { EcsUserAgent } from './user_agent';
import { EcsVulnerability } from './vulnerability';

/**
 * @internal
 */
export type Ecs = EcsBase &
  EcsTracing & {
    ecs: EcsField;

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
    log?: EcsLog;
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
