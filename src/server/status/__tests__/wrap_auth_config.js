import expect from 'expect.js';
import wrapAuthConfig from '../wrap_auth_config';

describe('Status wrapAuthConfig', () => {
  let options;

  beforeEach(() => {
    options = {
      method: 'GET',
      path: '/status',
      handler: function (request, reply) {
        return reply();
      }
    };
  });

  it('should return a function', () => {
    expect(wrapAuthConfig()).to.be.a('function');
    expect(wrapAuthConfig(true)).to.be.a('function');
    expect(wrapAuthConfig(false)).to.be.a('function');
  });

  it('should not add auth config by default', () => {
    const wrapAuth = wrapAuthConfig();
    const wrapped = wrapAuth(options);
    expect(wrapped).to.not.have.property('config');
  });

  it('should not add auth config if allowAnonymous is false', () => {
    const wrapAuth = wrapAuthConfig(false);
    const wrapped = wrapAuth(options);
    expect(wrapped).to.not.have.property('config');
  });

  it('should add auth config if allowAnonymous is true', () => {
    const wrapAuth = wrapAuthConfig(true);
    const wrapped = wrapAuth(options);
    expect(wrapped).to.have.property('config');
    expect(wrapped.config).to.have.property('auth');
    expect(wrapped.config.auth).to.be(false);
  });
});
