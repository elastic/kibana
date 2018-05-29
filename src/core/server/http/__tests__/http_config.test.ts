import { HttpConfig } from '../http_config';

test('has defaults for config', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {};
  expect(httpSchema.validate(obj)).toMatchSnapshot();
});

test('throws if invalid hostname', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    host: 'asdf$%^',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('can specify max payload as string', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    maxPayload: '2mb',
  };
  const config = httpSchema.validate(obj);
  expect(config.maxPayload.getValueInBytes()).toBe(2 * 1024 * 1024);
});

test('throws if basepath is missing prepended slash', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    basePath: 'foo',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath appends a slash', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    basePath: '/foo/',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath is not specified, but rewriteBasePath is set', () => {
  const httpSchema = HttpConfig.schema;
  const obj = {
    rewriteBasePath: true,
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

describe('with TLS', () => {
  test('throws if TLS is enabled but `key` is not specified', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if TLS is enabled but `certificate` is not specified', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        enabled: true,
        key: '/path/to/key',
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('throws if TLS is enabled but `redirectHttpFromPort` is equal to `port`', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      port: 1234,
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
        key: '/path/to/key',
        redirectHttpFromPort: 1234,
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });

  test('can specify single `certificateAuthority` as a string', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
        key: '/path/to/key',
        certificateAuthorities: '/authority/',
      },
    };

    const config = httpSchema.validate(obj);
    expect(config.ssl.certificateAuthorities).toBe('/authority/');
  });

  test('can specify several `certificateAuthorities`', () => {
    const httpSchema = HttpConfig.schema;
    const obj = {
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
        key: '/path/to/key',
        certificateAuthorities: ['/authority/1', '/authority/2'],
      },
    };

    const config = httpSchema.validate(obj);
    expect(config.ssl.certificateAuthorities).toEqual([
      '/authority/1',
      '/authority/2',
    ]);
  });

  test('accepts known protocols`', () => {
    const httpSchema = HttpConfig.schema;
    const singleKnownProtocol = {
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
        key: '/path/to/key',
        supportedProtocols: ['TLSv1'],
      },
    };

    const allKnownProtocols = {
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
        key: '/path/to/key',
        supportedProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
      },
    };

    const singleKnownProtocolConfig = httpSchema.validate(singleKnownProtocol);
    expect(singleKnownProtocolConfig.ssl.supportedProtocols).toEqual(['TLSv1']);

    const allKnownProtocolsConfig = httpSchema.validate(allKnownProtocols);
    expect(allKnownProtocolsConfig.ssl.supportedProtocols).toEqual([
      'TLSv1',
      'TLSv1.1',
      'TLSv1.2',
    ]);
  });

  test('should accept known protocols`', () => {
    const httpSchema = HttpConfig.schema;

    const singleUnknownProtocol = {
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
        key: '/path/to/key',
        supportedProtocols: ['SOMEv100500'],
      },
    };

    const allKnownWithOneUnknownProtocols = {
      ssl: {
        enabled: true,
        certificate: '/path/to/certificate',
        key: '/path/to/key',
        supportedProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'SOMEv100500'],
      },
    };

    expect(() =>
      httpSchema.validate(singleUnknownProtocol)
    ).toThrowErrorMatchingSnapshot();
    expect(() =>
      httpSchema.validate(allKnownWithOneUnknownProtocols)
    ).toThrowErrorMatchingSnapshot();
  });
});
