import { vi } from 'vitest';

vi.mock('./use_kibana');

describe('probe', () => {
  it('imports', async () => {
    const t0 = Date.now();
    await import('../mocks');
    // eslint-disable-next-line no-console
    console.log('mocks', Date.now() - t0);
    await import('./use_kibana');
    // eslint-disable-next-line no-console
    console.log('use_kibana', Date.now() - t0);
    vi.resetModules();
    const t1 = Date.now();
    await import('./use_kibana');
    // eslint-disable-next-line no-console
    console.log('after reset', Date.now() - t1);
  }, 120_000);
});
