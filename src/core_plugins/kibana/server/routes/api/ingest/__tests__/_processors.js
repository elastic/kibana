import _ from 'lodash';
import expect from 'expect.js';

export default function (scenarioManager, request) {
  describe('processors', () => {

    it('should return 200 for a successful run', function () {
      return request.get('/kibana/ingest/processors')
      .expect(200)
      .then((response) => {
        expect(_.isArray(response.body)).to.be(true);
      });
    });

  });
}
