/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const ICON_SET_MODULE = './eui_icon_set';
const DATA_URL_MODULE = '../step_icons/icon_to_data_url';

describe('loadTypeIconMasks', () => {
  const { JEST_WORKER_ID, NODE_ENV } = process.env;

  afterEach(() => {
    process.env.JEST_WORKER_ID = JEST_WORKER_ID;
    process.env.NODE_ENV = NODE_ENV;
    jest.resetModules();
    jest.dontMock(ICON_SET_MODULE);
    jest.dontMock(DATA_URL_MODULE);
  });

  it('is empty under Jest, without loading the icon set', async () => {
    const iconSetFactory = jest.fn(() => ({ euiIconComponents: {} }));
    jest.doMock(ICON_SET_MODULE, iconSetFactory, { virtual: true });

    await jest.isolateModulesAsync(async () => {
      const { loadTypeIconMasks } = await import('./type_icon_masks');
      await expect(loadTypeIconMasks()).resolves.toEqual({});
    });

    expect(iconSetFactory).not.toHaveBeenCalled();
  });

  it('builds one mask per data type from the shared icon set, loading it once', async () => {
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = 'production';
    const glyph = (name: string) => Object.assign(() => null, { glyph: name });
    const euiIconComponents = {
      tokenString: glyph('string'),
      tokenNumber: glyph('number'),
      tokenBoolean: glyph('boolean'),
      tokenArray: glyph('array'),
      tokenObject: glyph('object'),
      tokenNull: glyph('null'),
      tokenDate: glyph('date'),
      question: glyph('unknown'),
    };
    const iconSetFactory = jest.fn(() => ({ euiIconComponents }));
    jest.doMock(ICON_SET_MODULE, iconSetFactory, { virtual: true });
    jest.doMock(DATA_URL_MODULE, () => ({
      getDataUrlFromReactComponent: (component: { glyph: string }) => `data:${component.glyph}`,
    }));

    await jest.isolateModulesAsync(async () => {
      const { loadTypeIconMasks } = await import('./type_icon_masks');
      const first = await loadTypeIconMasks();
      const second = await loadTypeIconMasks();

      expect(first).toEqual({
        string: 'data:string',
        number: 'data:number',
        boolean: 'data:boolean',
        array: 'data:array',
        object: 'data:object',
        null: 'data:null',
        date: 'data:date',
        unknown: 'data:unknown',
      });
      expect(second).toBe(first);
    });

    expect(iconSetFactory).toHaveBeenCalledTimes(1);
  });
});
