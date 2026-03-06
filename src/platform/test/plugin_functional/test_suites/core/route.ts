/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { ClientRequest } from 'http';
import type { Socket } from 'net';
import type { Test } from 'supertest';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('route', function () {
    describe('timeouts', function () {
      // Sends `body` one character at a time with `interval` ms between each write.
      //
      // The first character is written immediately to initiate the TCP connection.
      // Subsequent characters are sent via setInterval only after the socket is
      // connected, preventing writes from being buffered during the TCP handshake
      // and arriving at the server in a single burst rather than drip-fed.
      const writeBodyCharAtATime = (request: Test, body: string, interval: number) => {
        return new Promise((resolve, reject) => {
          let charIdx = 0;
          let intervalId: ReturnType<typeof setInterval> | undefined;

          const startInterval = () => {
            intervalId = setInterval(() => {
              if (charIdx < body.length) {
                void request.write(body[charIdx++]);
              } else {
                clearInterval(intervalId);
                void request.end((err, res) => {
                  resolve(res);
                });
              }
            }, interval);
          };

          void request.on('error', (err) => {
            clearInterval(intervalId);
            reject(err);
          });

          void request.write(body[charIdx++]);

          const underlyingReq = (request as unknown as { req?: ClientRequest }).req;
          if (underlyingReq !== undefined) {
            underlyingReq.once('socket', (socket: Socket) => {
              if (socket.connecting) {
                socket.once('connect', startInterval);
              } else {
                setImmediate(startInterval);
              }
            });
          } else {
            startInterval();
          }
        });
      };

      describe('payload', function () {
        it(`should timeout if POST payload sending is too slow`, async () => {
          // start the request
          const request = supertest
            .post('/short_payload_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"foo":"bar"}', 20);

          await result.then(
            () => {
              throw new Error('Expected payload timeout error but request succeeded');
            },
            (err) => {
              expect(err.message).to.be('Request Timeout');
            }
          );
        });

        it(`should not timeout if POST payload sending is quick`, async () => {
          // start the request
          const request = supertest
            .post('/longer_payload_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"foo":"bar"}', 20);

          await result.then(
            (res) => {
              expect(res).to.have.property('statusCode', 200);
            },
            (err) => {
              throw err;
            }
          );
        });
      });

      describe('idle socket', function () {
        it('should timeout if payload sending has too long of an idle period', async function () {
          // start the request
          const request = supertest
            .post('/short_idle_socket_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"foo":"bar"}', 50);

          await result.then(
            () => {
              throw new Error('Expected idle socket timeout error but request succeeded');
            },
            (err) => {
              expect(err.message).to.be('socket hang up');
            }
          );
        });

        it('should not timeout if payload sending does not have too long of an idle period', async function () {
          // start the request
          const request = supertest
            .post('/longer_idle_socket_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"responseDelay":0}', 20);

          await result.then(
            (res) => {
              expect(res).to.have.property('statusCode', 200);
            },
            (err) => {
              throw err;
            }
          );
        });

        it('should timeout if servers response is too slow', async () => {
          await supertest
            .post('/short_idle_socket_timeout')
            .send({ responseDelay: 100 })
            .set('Content-Type', 'application/json')
            .set('kbn-xsrf', 'true')
            .then(() => expect('to throw').to.be('but it did NOT'))
            .catch((error) => expect(error.message).to.be('socket hang up'));
        });

        it('should not timeout if servers response is fast enough', async () => {
          await supertest
            .post('/longer_idle_socket_timeout')
            .send({ responseDelay: 100 })
            .set('Content-Type', 'application/json')
            .set('kbn-xsrf', 'true')
            .expect(200);
        });
      });
    });
  });
}
