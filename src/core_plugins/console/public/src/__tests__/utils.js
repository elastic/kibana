import expect from 'expect.js';

import utils from '../utils';

describe('console utils', () => {
  describe('collapseLiteralStrings', () => {
    it('will collapse multinline strings', () => {
      const multiline = '{ "foo": """bar\nbaz""" }';
      expect(utils.collapseLiteralStrings(multiline)).to.be('{ "foo": "bar\\nbaz" }');
    });

    it('will collapse multinline strings with CRLF endings', () => {
      const multiline = '{ "foo": """bar\r\nbaz""" }';
      expect(utils.collapseLiteralStrings(multiline)).to.be('{ "foo": "bar\\r\\nbaz" }');
    });
  });
});
