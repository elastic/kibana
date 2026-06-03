/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import http from 'node:http';
import https from 'node:https';
import type { ClientRequest } from 'http';
import type { Socket } from 'net';
import { format as formatUrl } from 'node:url';
import type { Test } from 'supertest';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');
  const config = getService('config');

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
          let dripStarted = false;

          const underlyingReq = (request as unknown as { req?: ClientRequest }).req;
          let socketWaitFallback: ReturnType<typeof setTimeout> | undefined;

          const startDripFeed = () => {
            if (dripStarted) {
              return;
            }
            dripStarted = true;
            intervalId = setInterval(() => {
              if (charIdx < body.length) {
                void request.write(body[charIdx++]);
              } else {
                clearInterval(intervalId);
                void request.end((err, res) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(res);
                  }
                });
              }
            }, interval);
          };

          void request.on('error', (err) => {
            clearInterval(intervalId);
            reject(err);
          });

          void request.write(body[charIdx++]);

          if (underlyingReq !== undefined) {
            // If `socket` never fires, or it fires with `connecting` but `connect` never fires,
            // still start the drip so the server can exercise payload timeouts (otherwise Mocha
            // hits the global hook timeout).
            socketWaitFallback = setTimeout(() => {
              socketWaitFallback = undefined;
              startDripFeed();
            }, 2000);
            underlyingReq.once('socket', (socket: Socket) => {
              if (socket.connecting) {
                socket.once('connect', () => {
                  if (socketWaitFallback !== undefined) {
                    clearTimeout(socketWaitFallback);
                    socketWaitFallback = undefined;
                  }
                  startDripFeed();
                });
              } else {
                if (socketWaitFallback !== undefined) {
                  clearTimeout(socketWaitFallback);
                  socketWaitFallback = undefined;
                }
                setImmediate(startDripFeed);
              }
            });
          } else {
            startDripFeed();
          }
        });
      };

      describe('payload', function () {
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

        it(`should timeout if POST payload sending is too slow`, async () => {
          // Use raw `http(s).request` + a chunked drip (same pattern as `fastify_http_server.test.ts`).
          // Supertest's `ClientRequest` + `writeBodyCharAtATime` can hang for the full Mocha timeout
          // on this suite while the Fastify backend still enforces `timeout.payload` correctly.
          await new Promise<void>((resolve, reject) => {
            const kibana = config.get('servers.kibana');
            const baseUrl = formatUrl(kibana);
            const target = new URL('/short_payload_timeout', baseUrl);
            const useHttps = target.protocol === 'https:';
            const transport = useHttps ? https : http;

            const opts: http.RequestOptions = {
              hostname: target.hostname,
              port: target.port || undefined,
              path: target.pathname,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Transfer-Encoding': 'chunked',
                'kbn-xsrf': 'true',
                Connection: 'close',
              },
            };
            if (useHttps && kibana.certificateAuthorities) {
              (opts as https.RequestOptions).ca = kibana.certificateAuthorities;
              (opts as https.RequestOptions).rejectUnauthorized = false;
            }

            const dripTimer: { id?: ReturnType<typeof setInterval> } = {};
            const req = transport.request(opts, (res) => {
              if (dripTimer.id !== undefined) {
                clearInterval(dripTimer.id);
              }
              if (res.statusCode === 408) {
                res.resume();
                resolve();
                return;
              }
              reject(
                new Error(
                  `Expected payload timeout (408 or client error) but got HTTP ${res.statusCode}`
                )
              );
            });

            req.on('error', (err) => {
              if (dripTimer.id !== undefined) {
                clearInterval(dripTimer.id);
              }
              try {
                expect(['Request Timeout', 'socket hang up', 'read ECONNRESET']).to.contain(
                  err.message
                );
                resolve();
              } catch (e) {
                reject(e);
              }
            });

            const body = '{"foo":"bar"}';
            let i = 0;
            dripTimer.id = setInterval(() => {
              if (i < body.length) {
                req.write(body[i++]);
              } else {
                if (dripTimer.id !== undefined) {
                  clearInterval(dripTimer.id);
                }
                req.end();
              }
            }, 20);
          });
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
