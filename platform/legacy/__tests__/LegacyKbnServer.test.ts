import { LegacyKbnServer } from '..';

test('correctly returns `newPlatformProxyListener`.', () => {
  const rawKbnServer = {
    newPlatform: {
      proxyListener: {}
    }
  };

  const legacyKbnServer = new LegacyKbnServer(rawKbnServer);
  expect(legacyKbnServer.newPlatformProxyListener).toBe(
    rawKbnServer.newPlatform.proxyListener
  );
});

test('correctly forwards log record.', () => {
  const rawKbnServer = {
    server: { log: jest.fn() }
  };

  const legacyKbnServer = new LegacyKbnServer(rawKbnServer);

  const timestamp = new Date(Date.UTC(2012, 1, 1, 11, 22, 33, 44));
  legacyKbnServer.log(['one', 'two'], 'message', timestamp);
  legacyKbnServer.log('three', new Error('log error'), timestamp);

  expect(rawKbnServer.server.log.mock.calls).toMatchSnapshot();
});
