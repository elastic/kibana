import { modifyUrl } from '../url';

describe('modifyUrl()', () => {
  test('throws an error with invalid input', () => {
    expect(() => modifyUrl(1 as any, () => ({}))).toThrowError();
    expect(() => modifyUrl(undefined as any, () => ({}))).toThrowError();
    expect(() =>
      modifyUrl('http://localhost', undefined as any)
    ).toThrowError();
  });

  test('supports returning a new url spec', () => {
    expect(modifyUrl('http://localhost', () => ({}))).toEqual('');
  });

  test('supports modifying the passed object', () => {
    expect(
      modifyUrl('http://localhost', parsed => {
        parsed.port = '9999';
        parsed.auth = 'foo:bar';
        return parsed;
      })
    ).toEqual('http://foo:bar@localhost:9999/');
  });

  test('supports changing pathname', () => {
    expect(
      modifyUrl('http://localhost/some/path', parsed => {
        parsed.pathname += '/subpath';
        return parsed;
      })
    ).toEqual('http://localhost/some/path/subpath');
  });

  test('supports changing port', () => {
    expect(
      modifyUrl('http://localhost:5601', parsed => {
        parsed.port = (Number.parseInt(parsed.port!) + 1).toString();
        return parsed;
      })
    ).toEqual('http://localhost:5602/');
  });

  test('supports changing protocol', () => {
    expect(
      modifyUrl('http://localhost', parsed => {
        parsed.protocol = 'mail';
        parsed.slashes = false;
        parsed.pathname = null;
        return parsed;
      })
    ).toEqual('mail:localhost');
  });
});
