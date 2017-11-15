import * as http from 'http';
import * as supertest from 'supertest';
import * as Chance from 'chance';

import { Env } from '../../../config/Env';
import { Router } from '../Router';
import { HttpServer } from '../HttpServer';
import { HttpConfig } from '../HttpConfig';
import * as schema from '../../../lib/schema';
import { logger } from '../../../logging/__mocks__';

const chance = new Chance();

let server: HttpServer;
let config: HttpConfig;

beforeEach(() => {
  config = {
    port: chance.integer({ min: 10000, max: 15000 }),
    host: '127.0.0.1',
    ssl: {}
  } as HttpConfig;

  server = new HttpServer(logger.get(), new Env('/kibana', {}));
});

afterEach(() => {
  server && server.stop();
  logger._clear();
});

test('listening after started', async () => {
  expect(server.isListening()).toBe(false);

  await server.start(config);

  expect(server.isListening()).toBe(true);
});

test('200 OK with body', async () => {
  const router = new Router('/foo');

  router.get({ path: '/' }, async (val, req, res) => {
    return res.ok({ key: 'value' });
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'value' });
    });
});

test('202 Accepted with body', async () => {
  const router = new Router('/foo');

  router.get({ path: '/' }, async (val, req, res) => {
    return res.accepted({ location: 'somewhere' });
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo')
    .expect(202)
    .then(res => {
      expect(res.body).toEqual({ location: 'somewhere' });
    });
});

test('204 No content', async () => {
  const router = new Router('/foo');

  router.get({ path: '/' }, async (val, req, res) => {
    return res.noContent();
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo')
    .expect(204)
    .then(res => {
      expect(res.body).toEqual({});
      // TODO Is ^ wrong or just a result of supertest, I expect `null` or `undefined`
    });
});

test('400 Bad request with error', async () => {
  const router = new Router('/foo');

  router.get({ path: '/' }, async (val, req, res) => {
    const err = new Error('some message');
    return res.badRequest(err);
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({ error: 'some message' });
    });
});

test('valid params', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/:test',
      validate: {
        params: schema.object({
          test: schema.string()
        })
      }
    },
    async (val, req, res) => {
      return res.ok({ key: req.params.test });
    }
  );

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo/some-string')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'some-string' });
    });
});

test('invalid params', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/:test',
      validate: {
        params: schema.object({
          test: schema.number()
        })
      }
    },
    async (val, req, res) => {
      return res.ok({ key: req.params.test });
    }
  );

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo/some-string')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[test]: expected value of type [number] but got [string]'
      });
    });
});

test('valid query', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/',
      validate: {
        query: schema.object({
          bar: schema.string(),
          quux: schema.number()
        })
      }
    },
    async (val, req, res) => {
      return res.ok(req.query);
    }
  );

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo?bar=test&quux=123')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ bar: 'test', quux: 123 });
    });
});

test('invalid query', async () => {
  const router = new Router('/foo');

  router.get(
    {
      path: '/',
      validate: {
        query: schema.object({
          bar: schema.number()
        })
      }
    },
    async (val, req, res) => {
      return res.ok(req.query);
    }
  );

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo?bar=test')
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[bar]: expected value of type [number] but got [string]'
      });
    });
});

test('valid body', async () => {
  const router = new Router('/foo');

  router.post(
    {
      path: '/',
      validate: {
        body: schema.object({
          bar: schema.string(),
          baz: schema.number()
        })
      }
    },
    async (val, req, res) => {
      return res.ok(req.body);
    }
  );

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .post('/foo')
    .send({
      bar: 'test',
      baz: 123
    })
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ bar: 'test', baz: 123 });
    });
});

test('invalid body', async () => {
  const router = new Router('/foo');

  router.post(
    {
      path: '/',
      validate: {
        body: schema.object({
          bar: schema.number()
        })
      }
    },
    async (val, req, res) => {
      return res.ok(req.body);
    }
  );

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .post('/foo')
    .send({ bar: 'test' })
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[bar]: expected value of type [number] but got [string]'
      });
    });
});

test('handles putting', async () => {
  const router = new Router('/foo');

  router.put({ path: '/' }, async (val, req, res) => {
    return res.ok(req.body);
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .put('/foo')
    .send({ key: 'new value' })
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'new value' });
    });
});

test('handles deleting', async () => {
  const router = new Router('/foo');

  router.delete({
    path: '/:id',
    validate: {
      params: schema.object({
        id: schema.number()
      })
    }
  }, async (val, req, res) => {
    return res.ok({ key: req.params.id });
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .delete('/foo/3')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 3 });
    });
});

test('returns 200 OK if returning object', async () => {
  const router = new Router('/foo');

  router.get({ path: '/' }, async (val, req, res) => {
    return { key: 'value' };
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'value' });
    });
});

test('filtered headers', async () => {
  expect.assertions(1);

  const router = new Router('/foo');

  let filteredHeaders: any;

  router.get({ path: '/' }, async (val, req, res) => {
    filteredHeaders = req.getFilteredHeaders(['x-kibana-foo', 'host']);

    return res.noContent();
  });

  server.registerRouter(router);

  await server.start(config);

  await supertest((server as any).server)
    .get('/foo?bar=quux')
    .set('x-kibana-foo', 'bar')
    .set('x-kibana-bar', 'quux');

  expect(filteredHeaders).toEqual({
    'x-kibana-foo': 'bar',
    host: `127.0.0.1:${config.port}`
  });
});

describe('when run within legacy platform', () => {
  let newPlatformProxyListenerMock: any;
  beforeEach(() => {
    newPlatformProxyListenerMock = {
      bind: jest.fn(),
      proxy: jest.fn()
    };

    const kbnServerMock = {
      newPlatformProxyListener: newPlatformProxyListenerMock
    };

    server = new HttpServer(
      logger.get(),
      new Env('/kibana', { kbnServer: kbnServerMock })
    );

    const router = new Router('/new');
    router.get({ path: '/' }, async (val, req, res) => {
      return res.ok({ key: 'new-platform' });
    });

    server.registerRouter(router);

    newPlatformProxyListenerMock.proxy.mockImplementation(
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ key: 'legacy-platform' }));
      }
    );
  });

  test('binds proxy listener to server.', async () => {
    expect(newPlatformProxyListenerMock.bind).not.toHaveBeenCalled();

    await server.start(config);

    expect(newPlatformProxyListenerMock.bind).toHaveBeenCalledTimes(1);
    expect(newPlatformProxyListenerMock.bind).toHaveBeenCalledWith(
      expect.any(http.Server)
    );
    expect(newPlatformProxyListenerMock.bind.mock.calls[0][0]).toBe(
      (server as any).server
    );
  });

  test('forwards request to legacy platform if new one can not handle it', async () => {
    await server.start(config);

    await supertest((server as any).server)
      .get('/legacy')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'legacy-platform' });
        expect(newPlatformProxyListenerMock.proxy).toHaveBeenCalledTimes(1);
        expect(newPlatformProxyListenerMock.proxy).toHaveBeenCalledWith(
          expect.any(http.IncomingMessage),
          expect.any(http.ServerResponse)
        );
      });
  });

  test('do not forward request to legacy platform if new one can handle it', async () => {
    await server.start(config);

    await supertest((server as any).server)
      .get('/new')
      .expect(200)
      .then(res => {
        expect(res.body).toEqual({ key: 'new-platform' });
        expect(newPlatformProxyListenerMock.proxy).not.toHaveBeenCalled();
      });
  });
});
