import expect from 'expect.js';
import sinon from 'sinon';
import { createReplaceLegacyKey } from '../replace_legacy_key';

describe('createReplaceLegacyKey', function () {
  let replaceLegacyKey;

  beforeEach(function () {
    replaceLegacyKey = createReplaceLegacyKey({
      oldKey: 'newKey'
    });
  });

  it('returns non-legacy key', function () {
    const nonLegacyKey = replaceLegacyKey('nonLegacyKey');
    expect(nonLegacyKey).to.be('nonLegacyKey');
  });

  it('doesn\'t log anything when not replacing a key', function () {
    const log = sinon.spy();
    replaceLegacyKey('nonLegacyKey', log);
    expect(log.called).to.be(false);
  });

  it('returns newKey when called with legacyKey', function () {
    const newKey = replaceLegacyKey('oldKey');
    expect(newKey).to.be('newKey');
  });

  it ('logs when repacing a key', function () {
    const log = sinon.spy();
    replaceLegacyKey('oldKey', log);
    expect(log.calledOnce).to.be(true);
  });
});
