/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExposedToBrowserDescriptor } from './types';
import { createBrowserConfig } from './create_browser_config';

describe('createBrowserConfig', () => {
  it('picks nothing by default', () => {
    const config = {
      foo: 'bar',
      nested: {
        str: 'string',
        num: 42,
      },
    };
    const descriptor: ExposedToBrowserDescriptor<typeof config> = {};

    const browserConfig = createBrowserConfig(config, descriptor);

    expect(browserConfig).toEqual({});
  });

  it('picks all the nested properties when using `true`', () => {
    const config = {
      foo: 'bar',
      nested: {
        str: 'string',
        num: 42,
      },
    };

    const descriptor: ExposedToBrowserDescriptor<typeof config> = {
      foo: true,
      nested: true,
    };

    const browserConfig = createBrowserConfig(config, descriptor);

    expect(browserConfig).toEqual({
      foo: 'bar',
      nested: {
        str: 'string',
        num: 42,
      },
    });
  });

  it('picks specific nested properties when using a nested declaration', () => {
    const config = {
      foo: 'bar',
      nested: {
        str: 'string',
        num: 42,
      },
    };

    const descriptor: ExposedToBrowserDescriptor<typeof config> = {
      foo: true,
      nested: {
        str: true,
        num: false,
      },
    };

    const browserConfig = createBrowserConfig(config, descriptor);

    expect(browserConfig).toEqual({
      foo: 'bar',
      nested: {
        str: 'string',
      },
    });
  });

  it('accepts deeply nested structures', () => {
    const config = {
      foo: 'bar',
      deeply: {
        str: 'string',
        nested: {
          hello: 'dolly',
          structure: {
            propA: 'propA',
            propB: 'propB',
          },
        },
      },
    };

    const descriptor: ExposedToBrowserDescriptor<typeof config> = {
      foo: false,
      deeply: {
        str: false,
        nested: {
          hello: true,
          structure: {
            propA: true,
            propB: false,
          },
        },
      },
    };

    const browserConfig = createBrowserConfig(config, descriptor);

    expect(browserConfig).toEqual({
      deeply: {
        nested: {
          hello: 'dolly',
          structure: {
            propA: 'propA',
          },
        },
      },
    });
  });

  it('only includes leaf properties that are `true` when in nested structures', () => {
    const config = {
      foo: 'bar',
      deeply: {
        str: 'string',
        nested: {
          hello: 'dolly',
          structure: {
            propA: 'propA',
            propB: 'propB',
          },
        },
      },
    };

    const descriptor: ExposedToBrowserDescriptor<typeof config> = {
      deeply: {
        nested: {
          hello: true,
          structure: {
            propA: true,
          },
        },
      },
    };

    const browserConfig = createBrowserConfig(config, descriptor);

    expect(browserConfig).toEqual({
      deeply: {
        nested: {
          hello: 'dolly',
          structure: {
            propA: 'propA',
          },
        },
      },
    });
  });
});
