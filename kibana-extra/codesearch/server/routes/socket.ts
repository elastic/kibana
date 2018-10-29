/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import SocketIO, { Socket } from 'socket.io';

import { SocketKind } from '../../model';
import { Server } from '../kibana_types';
import { Log } from '../log';
import { SocketService } from '../socket_service';

export function socketRoute(server: Server, socketService: SocketService, log: Log) {
  const socketIO = SocketIO(server.listener, { path: '/ws' });

  socketIO.on('connection', (socket: Socket) => {
    log.info('User connected, attaching handlers and register socket.');

    socketService.registerSocket(SocketKind.CLONE_PROGRESS, socket);
    socketService.registerSocket(SocketKind.DELETE_PROGRESS, socket);
    socketService.registerSocket(SocketKind.INDEX_PROGRESS, socket);

    // TODO(mengwei): apply the same security check as Canvas does.
    // const request = socket.handshake;
    // const authHeader = getAuthHeader(request, server);

    socket.on('disconnect', () => {
      log.info('User disconnected, removing handlers and unregister sockets.');
      socketService.unregisterSocket(SocketKind.CLONE_PROGRESS);
      socketService.unregisterSocket(SocketKind.DELETE_PROGRESS);
      socketService.unregisterSocket(SocketKind.INDEX_PROGRESS);
    });
  });
}
