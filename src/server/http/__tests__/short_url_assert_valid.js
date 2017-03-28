import { shortUrlAssertValid } from '../short_url_assert_valid';


describe('shortUrlAssertValid()', () => {
  const invalid = [
    ['protocol', 'http://localhost:5601/app/kibana'],
    ['protocol', 'https://localhost:5601/app/kibana'],
    ['protocol', 'mailto:foo@bar.net'],
    ['protocol', 'javascript:alert("hi")'], // eslint-disable-line no-script-url
    ['hostname', 'localhost/app/kibana'],
    ['hostname and port', 'local.host:5601/app/kibana'],
    ['hostname and auth', 'user:pass@localhost.net/app/kibana'],
    ['path traversal', '/app/../../not-kibana'],
    ['deep path', '/app/kibana/foo'],
    ['deep path', '/app/kibana/foo/bar'],
    ['base path', '/base/app/kibana'],
  ];

  invalid.forEach(([desc, url]) => {
    it(`fails when url has ${desc}`, () => {
      try {
        shortUrlAssertValid(url);
        throw new Error(`expected assertion to throw`);
      } catch (err) {
        if (!err || !err.isBoom) {
          throw err;
        }
      }
    });
  });

  const valid = [
    '/app/kibana',
    '/app/monitoring#angular/route',
    '/app/text#document-id',
    '/app/some?with=query',
    '/app/some?with=query#and-a-hash',
  ];

  valid.forEach(url => {
    it(`allows ${url}`, () => {
      shortUrlAssertValid(url);
    });
  });

});
