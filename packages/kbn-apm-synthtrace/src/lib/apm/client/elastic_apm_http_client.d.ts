/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
declare module 'elastic-apm-http-client' {
  import EventEmitter from 'events';

  class Client extends EventEmitter {
    constructor(opts: ClientOptions);

    sent: number;
    public setExtraMetadata(metadata: import('././intake_v2/metadata').Metadata): void;

    public sendSpan(span: import('././intake_v2/span').Span, callback: () => void): void;
    public sendTransaction(
      transaction: import('././intake_v2/transaction').Transaction,
      callback: () => void
    ): void;
    public sendError(error: import('././intake_v2/error').Error, callback: () => void): void;

    public flush(opts: FlushOptions, callback: () => void): void;
    public destroy(): void;
    public _getStats(): ClientStats;
  }
  interface ClientStats {
    numEvents: number;
    numEventsDropped: number;
    numEventsEnqueued: number;
    numEventsSent: number;
    slowWriteBatch: number;
    backoffReconnectCount: number;
  }
  interface ClientOptions {
    /** (required) The HTTP user agent that your module should identify itself as */
    userAgent: string;
    /** The Elastic APM intake API secret token */
    secretToken?: string;
    /** Elastic APM API key */
    apiKey?: string;
    /** The APM Server URL (default: http://localhost:8200) */
    serverUrl: string;
    maxQueueSize?: number;
    bufferWindowSize?: number;

    /** (required) The APM agent name */
    agentName: string;
    /** (required) The APM agent version */
    agentVersion: string;
    /** The name of the service being instrumented */
    serviceName: string;
    /** Unique name of the service being instrumented */
    serviceNodeName?: string;
    /** The version of the service being instrumented */
    serviceVersion?: string;
    /** If the service being instrumented is running a specific framework, use this config option to log its name */
    frameworkName?: string;
    /** If the service being instrumented is running a specific framework, use this config option to log its version */
    frameworkVersion?: string;
    /** Custom hostname (default: OS hostname) */
    hostname?: string;
    /** Environment name (default: process.env.NODE_ENV || 'development') */
    environment?: string;
    /** Docker container id, if not given will be parsed from /proc/self/cgroup */
    containerId?: string;
    /** Kubernetes node name */
    kubernetesNodeName?: string;
    /** Kubernetes namespace */
    kubernetesNamespace?: string;
    /** Kubernetes pod name, if not given will be the hostname */
    kubernetesPodName?: string;
    /** Kubernetes pod id, if not given will be parsed from /proc/self/cgroup */
    kubernetesPodUID?: string;
    /** An object of key/value pairs to use to label all data reported (only applied when using APM Server 7.1+) */
    globalLabels?: Record<string, string>;
  }
  class FlushOptions {}
  export = Client;
}
