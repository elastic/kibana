/// <reference types="node" />
/// <reference types="node" />
import { ConnectionOptions as TlsConnectionOptions } from 'tls';
import { URL } from 'url';
import { Transport, Serializer, Diagnostic, BaseConnectionPool } from '@elastic/transport';
import { HttpAgentOptions, UndiciAgentOptions, agentFn, nodeFilterFn, nodeSelectorFn, generateRequestIdFn, BasicAuth, ApiKeyAuth, BearerAuth, Context } from '@elastic/transport/lib/types';
import { RedactionOptions } from '@elastic/transport/lib/Transport';
import BaseConnection from '@elastic/transport/lib/connection/BaseConnection';
import SniffingTransport from './sniffingTransport';
import Helpers from './helpers';
import API from './api';
export interface NodeOptions {
    url: URL;
    id?: string;
    agent?: HttpAgentOptions | UndiciAgentOptions;
    ssl?: TlsConnectionOptions;
    headers?: Record<string, any>;
    roles?: {
        master: boolean;
        data: boolean;
        ingest: boolean;
        ml: boolean;
    };
}
export interface ClientOptions {
    node?: string | string[] | NodeOptions | NodeOptions[];
    nodes?: string | string[] | NodeOptions | NodeOptions[];
    Connection?: typeof BaseConnection;
    ConnectionPool?: typeof BaseConnectionPool;
    Transport?: typeof Transport;
    Serializer?: typeof Serializer;
    maxRetries?: number;
    requestTimeout?: number;
    pingTimeout?: number;
    sniffInterval?: number | boolean;
    sniffOnStart?: boolean;
    sniffEndpoint?: string;
    sniffOnConnectionFault?: boolean;
    resurrectStrategy?: 'ping' | 'optimistic' | 'none';
    compression?: boolean;
    tls?: TlsConnectionOptions;
    agent?: HttpAgentOptions | UndiciAgentOptions | agentFn | false;
    nodeFilter?: nodeFilterFn;
    nodeSelector?: nodeSelectorFn;
    headers?: Record<string, any>;
    opaqueIdPrefix?: string;
    generateRequestId?: generateRequestIdFn;
    name?: string | symbol;
    auth?: BasicAuth | ApiKeyAuth | BearerAuth;
    context?: Context;
    proxy?: string | URL;
    enableMetaHeader?: boolean;
    cloud?: {
        id: string;
    };
    disablePrototypePoisoningProtection?: boolean | 'proto' | 'constructor';
    caFingerprint?: string;
    maxResponseSize?: number;
    maxCompressedResponseSize?: number;
    redaction?: RedactionOptions;
}
export default class Client extends API {
    diagnostic: Diagnostic;
    name: string | symbol;
    connectionPool: BaseConnectionPool;
    transport: SniffingTransport;
    serializer: Serializer;
    helpers: Helpers;
    constructor(opts: ClientOptions);
    child(opts: ClientOptions): Client;
    close(): Promise<void>;
}
