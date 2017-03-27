import sinon from 'sinon';
import expect from 'expect.js';

import { ensureAllowExplicitIndex } from '../ensure_allow_explicit_index';

const createStubCallWithInternal = responders => (
  sinon.spy(async (params) => {
    if (responders.length) {
      return await responders.shift()(params);
    }

    throw new Error('Unexpected client.mget call');
  })
);

const createStubConfig = () => ({
  get: sinon.spy((key) => {
    switch (key) {
      case 'kibana.index': return '.kibana';
      case 'pkg.version': return '0.0.0';
      default: throw new Error(`Unexpected config.get('${key}') call`);
    }
  })
});

describe('ensureAllowExplicitIndex()', () => {
  it('attempts an mget with index in request', async () => {
    const config = createStubConfig();
    const callWithInternalUser = createStubCallWithInternal([
      () => ({ ok: true })
    ]);

    const resp = await ensureAllowExplicitIndex(callWithInternalUser, config);
    expect(resp).to.be(true);
  });

  it(`reports "illegal_argument_exception" that mentions "explicit index"`, async () => {
    const config = createStubConfig();
    const callWithInternalUser = createStubCallWithInternal([
      () => ({
        error: {
          type: 'illegal_argument_exception',
          reason: 'explicit index not supported'
        }
      })
    ]);

    try {
      await ensureAllowExplicitIndex(callWithInternalUser, config);
      throw new Error('expected ensureAllowExplicitIndex() to throw error');
    } catch (error) {
      expect(error.message).to.contain('rest.action.multi.allow_explicit_index');
    }
  });

  it('reports unexpected errors', async () => {
    const config = createStubConfig();
    const callWithInternalUser = createStubCallWithInternal([
      () => ({
        error: {
          type: 'foo',
          reason: 'bar'
        }
      })
    ]);

    try {
      await ensureAllowExplicitIndex(callWithInternalUser, config);
      throw new Error('expected ensureAllowExplicitIndex() to throw error');
    } catch (error) {
      expect(error.message).to.contain('[foo]');
      expect(error.message).to.contain('bar');
    }
  });
});
