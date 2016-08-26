import createTestData from './data';
import expect from 'expect.js';

export default function (scenarioManager, request) {

  describe('DELETE ingest', function deleteIngestConfig() {

    beforeEach(function () {
      return scenarioManager.reload('emptyKibana')
      .then(function () {
        return request.post('/kibana/ingest')
        .send(createTestData())
        .expect(204);
      });
    });

    afterEach(function () {
      return request.del('/kibana/ingest/logstash-*')
      .then(function () {
        return scenarioManager.client.indices.deleteTemplate({ name: 'kibana-logstash-*' })
        .catch(function (err) {
          if (err.status !== 404) {
            throw err;
          }
        });
      });
    });

    it('should return 200 for successful deletion of pattern and template', function () {
      return request.del('/kibana/ingest/logstash-*')
        .expect(200)
        .then(function () {
          return request.get('/kibana/ingest/logstash-*').expect(404);
        })
        .then(function () {
          return scenarioManager.client.indices.getTemplate({ name: 'kibana-logstash-*' })
            .catch(function (error) {
              expect(error.status).to.be(404);
            });
        })
        .then(function () {
          return scenarioManager.client.transport.request({
            path: '_ingest/pipeline/kibana-logstash-*',
            method: 'GET'
          })
          .catch(function (error) {
            expect(error.status).to.be(404);
          });
        });
    });

    it('should return 404 for a non-existent id', function () {
      return request.del('/kibana/ingest/doesnotexist')
        .expect(404);
    });

  });
}
