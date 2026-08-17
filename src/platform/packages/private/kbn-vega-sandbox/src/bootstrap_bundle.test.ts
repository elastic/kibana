/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { bundleDir } from '../server';
import { VEGA_SANDBOX_BUNDLE_FILE } from './common';

const createVmContext = (): {
  sandbox: Record<string, unknown>;
  windowObj: Record<string, unknown>;
} => {
  const documentElement = { style: {} as Record<string, string> };
  const windowObj: Record<string, unknown> = {
    __kbnBundles__: undefined,
    __kbnPublicPath__: undefined,
    addEventListener: (): void => undefined,
    parent: { postMessage: (): void => undefined },
    document: {
      documentElement,
      getElementById: (id: string) =>
        id === 'vega-sandbox-root' ? { replaceChildren(): void {}, append(): void {} } : null,
      createElement: () => ({
        style: {},
        setAttribute(): void {},
        getAttribute: (): string | null => null,
      }),
      head: { appendChild(): void {} },
      addEventListener(): void {},
    },
  };
  const sandbox: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(globalThis)) {
    if (key === 'globalThis' || key.startsWith('__kbn')) {
      continue;
    }
    try {
      sandbox[key] = (globalThis as Record<string, unknown>)[key];
    } catch {
      // Ignore host getters that throw outside their original context.
    }
  }
  sandbox.window = windowObj;
  sandbox.self = windowObj;
  sandbox.document = windowObj.document;
  sandbox.globalThis = sandbox;
  sandbox.HTMLAnchorElement = class {
    click(): void {}
    dispatchEvent(): boolean {
      return true;
    }
  };
  return { sandbox, windowObj };
};

describe('vega sandbox webpack artifact', () => {
  it('executes without Kibana runtime globals', () => {
    const bundlePath = join(bundleDir, VEGA_SANDBOX_BUNDLE_FILE);
    expect(existsSync(bundlePath)).toBe(true);

    const { sandbox, windowObj } = createVmContext();
    vm.runInNewContext(readFileSync(bundlePath, 'utf8'), sandbox);

    expect(windowObj.__kbnBundles__).toBeUndefined();
    expect(windowObj.__kbnPublicPath__).toBeUndefined();
    expect(windowObj.__kbnVegaSandbox__).toEqual(
      expect.objectContaining({
        renderVegaDescriptor: expect.any(Function),
        versions: expect.objectContaining({
          vega: expect.any(String),
          vegaLite: expect.any(String),
        }),
      })
    );
  });
});
