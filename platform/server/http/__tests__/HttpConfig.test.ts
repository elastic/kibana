import * as schema from '../../../lib/schema';
import { HttpConfig } from '../HttpConfig';

test('has defaults for config', () => {
  const httpSchema = HttpConfig.createSchema(schema);
  const obj = {};
  expect(httpSchema.validate(obj)).toMatchSnapshot();
});

test('throws if invalid hostname', () => {
  const httpSchema = HttpConfig.createSchema(schema);
  const obj = {
    host: 'asdf$%^'
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('can specify max payload as string', () => {
  const httpSchema = HttpConfig.createSchema(schema);
  const obj = {
    maxPayload: '2mb'
  };
  const config = httpSchema.validate(obj);
  expect(config.maxPayload.getValueInBytes()).toBe(2 * 1024 * 1024);
});

test('throws is basepath is missing prepended slash', () => {
  const httpSchema = HttpConfig.createSchema(schema);
  const obj = {
    basePath: 'foo'
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws is basepath appends a slash', () => {
  const httpSchema = HttpConfig.createSchema(schema);
  const obj = {
    basePath: '/foo/'
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});
