import expect from 'expect.js';
import sinon from 'sinon';

import { errorIfXPackInstall, errorIfXPackRemove } from '../error_if_x_pack';

describe('error_if_xpack', () => {
  const logger = {
    error: sinon.stub()
  };

  beforeEach(() => {
    sinon.stub(process, 'exit');
  });

  it('should exit on install if x-pack by name', () => {
    errorIfXPackInstall({
      plugin: 'x-pack'
    }, logger);
    expect(process.exit.called).to.be(true);
  });

  it('should exit on install if x-pack by url', () => {
    errorIfXPackInstall({
      plugin: ' http://localhost/x-pack/x-pack-7.0.0-alpha1-SNAPSHOT.zip'
    }, logger);
    expect(process.exit.called).to.be(true);
  });

  it('should not exit on install if not x-pack', () => {
    errorIfXPackInstall({
      plugin: 'foo'
    }, logger);
    expect(process.exit.called).to.be(false);
  });

  it('should exit on remove if x-pack', () => {
    errorIfXPackRemove({
      plugin: 'x-pack'
    }, logger);
    expect(process.exit.called).to.be(true);
  });

  it('should not exit on remove if not x-pack', () => {
    errorIfXPackRemove({
      plugin: 'bar'
    }, logger);
    expect(process.exit.called).to.be(false);
  });

  afterEach(() => {
    process.exit.restore();
  });
});
