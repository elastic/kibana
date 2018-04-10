import { wrapAuthConfig } from './wrap_auth_config';

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
    expect(typeof wrapAuthConfig()).toBe('function');
    expect(typeof wrapAuthConfig(true)).toBe('function');
    expect(typeof wrapAuthConfig(false)).toBe('function');
  });

  it('should not add auth config by default', () => {
    const wrapAuth = wrapAuthConfig();
    const wrapped = wrapAuth(options);
    expect(wrapped).not.toHaveProperty('config');
  });

  it('should not add auth config if allowAnonymous is false', () => {
    const wrapAuth = wrapAuthConfig(false);
    const wrapped = wrapAuth(options);
    expect(wrapped).not.toHaveProperty('config');
  });

  it('should add auth config if allowAnonymous is true', () => {
    const wrapAuth = wrapAuthConfig(true);
    const wrapped = wrapAuth(options);
    expect(wrapped).toHaveProperty('config');
    expect(wrapped.config).toHaveProperty('auth');
    expect(wrapped.config.auth).toBe(false);
  });
});
