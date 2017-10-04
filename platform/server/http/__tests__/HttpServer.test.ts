import * as supertest from 'supertest';
import * as Chance from 'chance';

import { Router } from '../Router';
import { HttpServer } from '../HttpServer';
import * as schema from '../../../lib/schema';

const chance = new Chance();

let server: HttpServer;
let app: any;
let port: number;

beforeEach(() => {
  port = chance.integer({ min: 10000, max: 15000 });
  server = new HttpServer();
  app = (server as any).httpServer;
});

afterEach(() => {
  server && server.stop();
});

test('listening after started', async () => {
  expect(server.isListening()).toBe(false);

  await server.start(port, '127.0.0.1');

  expect(server.isListening()).toBe(true);
});

test('200 OK with body', async () => {
  const router = new Router('/foo');

  router.get({ path: '/' }, async (val, req, res) => {
    return res.ok({ key: 'value' });
  });

  server.registerRouter(router);

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
    .post('/foo')
    .send({ bar: 'test' })
    .expect(400)
    .then(res => {
      expect(res.body).toEqual({
        error: '[bar]: expected value of type [number] but got [string]'
      });
    });
});

test('returns 200 OK if returning object', async () => {
  const router = new Router('/foo');

  router.get({ path: '/' }, async (val, req, res) => {
    return res.ok({ key: 'value' });
  });

  server.registerRouter(router);

  await server.start(port, '127.0.0.1');

  await supertest(app)
    .get('/foo')
    .expect(200)
    .then(res => {
      expect(res.body).toEqual({ key: 'value' });
    });
});

test('returns result from `onRequest` handler as first param in route handler', async () => {
  expect.assertions(1);

  const router = new Router('/foo', {
    onRequest(req) {
      return {
        q: req.query
      };
    }
  });

  let receivedValue: any;

  router.get({ path: '/' }, async (val, req, res) => {
    receivedValue = val;
    return res.noContent();
  });

  server.registerRouter(router);

  await server.start(port, '127.0.0.1');

  await supertest(app).get('/foo?bar=quux');

  expect(receivedValue).toEqual({
    q: {
      bar: 'quux'
    }
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

  await server.start(port, '127.0.0.1');

  await supertest(app)
    .get('/foo?bar=quux')
    .set('x-kibana-foo', 'bar')
    .set('x-kibana-bar', 'quux');

  expect(filteredHeaders).toEqual({
    'x-kibana-foo': 'bar',
    host: `127.0.0.1:${port}`
  });
});
