import { Client } from 'elasticsearch';
import { callAPI } from '../call_api';

test('should call the api when it exists, with the right context and params', async () => {
  let apiContext;
  const baz = jest.fn(function() {
    apiContext = this;
  });
  const client: any = { foo: { bar: { baz: baz }}};
  const result = await callAPI(client, 'foo.bar.baz', {}, {});

  expect(baz).toHaveBeenCalledWith({});
  expect(apiContext).toBe(client.foo.bar);
});

test('should fail when endpoint does not exist on client', async () => {
  expect.assertions(1);

  const client: any = {};

  try {
    await callAPI(client, 'foo.bar.baz', {}, {});
  } catch (error) {
    expect(error.message).toEqual('called with an invalid endpoint: foo.bar.baz');
  }
});

test('should handle top-level endpoint', async () => {
  let apiContext;
  const fooFn = jest.fn(function() {
    apiContext = this;
  });
  const client: any = { foo: fooFn };
  const result = await callAPI(client, 'foo', {}, {});

  expect(apiContext).toBe(client);
});

test('should handle failing api call', async () => {
  expect.assertions(2);

  const fooFn = () => {
    throw new Error('api call failed');
  };

  const client: any = { foo: fooFn };

  try {
    await callAPI(client, 'foo', {}, {});
  } catch (error) {
    expect(error.message).toEqual('api call failed');
    expect(error.wrap401Errors).toBeUndefined();
  }
});

// TODO: change this test after implementing
// homegrown error lib or boom
// https://github.com/elastic/kibana/issues/12464
test('should wrap 401 errors', async () => {
  expect.assertions(2);

  const fooFn = () => {
    const err: any = new Error('api call failed');
    err.statusCode = 401;
    throw err;
  };

  const client: any = { foo: fooFn };

  try {
    await callAPI(client, 'foo', {}, {});
  } catch (error) {
    expect(error.message).toEqual('api call failed');
    expect(error.wrap401Errors).toBe(true);
  }
});
