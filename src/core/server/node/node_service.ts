/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cluster from 'cluster';
import { take } from 'rxjs/operators';
import { Logger } from '@kbn/logging';
import { IConfigService } from '@kbn/config';
import { CoreContext } from '../core_context';
import { config as nodeConfig, NodeConfigType } from './node_config';
import {
  NodeMessagePayload,
  BroadcastOptions,
  TransferBroadcastMessage,
  MessageHandler,
  MessageHandlerUnsubscribeFn,
} from './types';
import { isBroadcastMessage } from './utils';

/**
 * @public
 */
export interface NodeServiceSetup {
  isEnabled: () => boolean;
  getWorkerId: () => number;
  broadcast: (type: string, payload?: NodeMessagePayload, options?: BroadcastOptions) => void;
  addMessageHandler: (type: string, handler: MessageHandler) => MessageHandlerUnsubscribeFn;
  // TODO: isMainWorker
}

/**
 * Worker-side node clustering service
 */
export class NodeService {
  private readonly log: Logger;
  private readonly configService: IConfigService;
  private readonly messageHandlers = new Map<string, MessageHandler[]>();

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('node', 'service');
    this.configService = coreContext.configService;
  }

  public async setup(): Promise<NodeServiceSetup> {
    const config = await this.configService
      .atPath<NodeConfigType>(nodeConfig.path)
      .pipe(take(1))
      .toPromise();
    const enabled = config.enabled && cluster.isWorker;

    process.on('message', (message) => {
      if (isBroadcastMessage(message)) {
        this.handleMessage(message);
      }
    });

    return {
      isEnabled: () => enabled,
      getWorkerId: () => (enabled ? cluster.worker.id : -1),
      broadcast: (type, payload, options) => this.broadcast(type, payload, options),
      addMessageHandler: (type, handler) => {
        this.messageHandlers.set(type, [...(this.messageHandlers.get(type) || []), handler]);
        return () => {
          this.messageHandlers.set(
            type,
            this.messageHandlers.get(type)!.filter((h) => h !== handler)
          );
        };
      },
    };
  }

  private handleMessage(message: TransferBroadcastMessage) {
    this.log.debug(`Received message of type ${message.type}`);
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach((handler) => {
      handler(message.payload);
    });
  }

  private broadcast(type: string, payload?: NodeMessagePayload, options?: BroadcastOptions) {
    process.send!({
      _kind: 'kibana-broadcast',
      type,
      payload,
      options,
    });
  }
}
