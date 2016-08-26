import expect from 'expect.js';

export default function (request) {
  describe('Languages API', function getLanguages() {

    it('should return 200 with an array of languages', function () {
      return request.get('/kibana/scripts/languages')
      .expect(200)
      .then(function (response) {
        expect(response.body).to.be.an('array');
      });
    });

    it('should only return langs enabled for inline scripting', function () {
      return request.get('/kibana/scripts/languages')
      .expect(200)
      .then(function (response) {
        expect(response.body).to.contain('expression');
        expect(response.body).to.contain('painless');

        expect(response.body).to.not.contain('groovy');
      });
    });
  });
}
