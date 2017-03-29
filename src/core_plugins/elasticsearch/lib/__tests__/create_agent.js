import expect from 'expect.js';
import createAgent from '../create_agent';
import https from 'https';
import http from 'http';

describe('plugins/elasticsearch', function () {
  describe('lib/create_agent', function () {

    it(`uses http.Agent when url's protocol is http`, function () {
      const config = {
        url: 'http://localhost:9200'
      };

      const agent = createAgent(config);
      expect(agent).to.be.a(http.Agent);
    });

    it(`throws an Error when url's protocol is https and ssl.verificationMode isn't set`, function () {
      const config = {
        url: 'https://localhost:9200'
      };

      expect(createAgent).withArgs(config).to.throwException();
    });

    it(`uses https.Agent when url's protocol is https and ssl.verificationMode is full`, function () {
      const config = {
        url: 'https://localhost:9200',
        ssl: {
          verificationMode: 'full'
        }
      };

      const agent = createAgent(config);
      expect(agent).to.be.a(https.Agent);
    });
  });
});
