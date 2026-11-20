/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UrlParts } from './url_parts';

type ServerUrlParts = UrlParts & {
  certificateAuthorities?: Array<string | Buffer>;
};

export interface ScoutServerConfig {
  serverless?: boolean;
  http2?: boolean;
  servers: {
    kibana: ServerUrlParts;
    elasticsearch: ServerUrlParts;
    linkedElasticsearch?: ServerUrlParts;
    fleet?: ServerUrlParts;
  };
  dockerServers: any;
  esTestCluster: {
    from: string;
    license?: string;
    files: string[];
    serverArgs: string[];
    esJavaOpts?: string;
    ssl: boolean;
    secureFiles?: string[];
  };
<<<<<<< HEAD
  esServerlessOptions?: { uiam: boolean; uiamOAuth?: boolean; cps?: boolean };
=======
  esServerlessOptions?: {
    uiam: boolean;
    uiamOAuth?: boolean;
    /** ISO-8601 lifetime of UIAM ephemeral tokens, from PT1M to PT5M (UIAM defaults to PT5M). */
    uiamEphemeralTokenExpiration?: string;
    /** ISO-8601 lifetime of UIAM session access tokens, at least PT1M (UIAM defaults to PT1H). */
    uiamAccessTokenExpiration?: string;
    cps?: boolean;
    /**
     * Extra host IP to publish the serverless ES port on. Docker otherwise
     * binds loopback only, which an Endpoint VM cannot reach.
     */
    host?: string;
  };
>>>>>>> 0a53d384287d (fix(security): renew session credentials for API key grants (#299332))
  kbnTestServer: {
    env: any;
    buildArgs: string[];
    sourceArgs: string[];
    serverArgs: string[];
    useDedicatedTestRunner?: boolean;
  };
}
