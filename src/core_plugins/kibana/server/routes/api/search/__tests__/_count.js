import expect from 'expect.js';

export default function (scenarioManager, request) {
  describe('Count API', function postIngest() {

    before(function () {
      return scenarioManager.client.create({
        index: 'foo-1',
        type: 'bar',
        id: '1',
        body: {
          foo: 'bar'
        }
      })
      .then(function () {
        return scenarioManager.client.create({
          index: 'foo-2',
          type: 'bar',
          id: '2',
          body: {
            foo: 'bar'
          }
        });
      })
      .then(function () {
        return scenarioManager.client.indices.refresh({
          index: ['foo-1', 'foo-2']
        });
      });
    });

    after(function () {
      return scenarioManager.reload('emptyKibana')
      .then(function () {
        scenarioManager.client.indices.delete({
          index: 'foo*'
        });
      });
    });

    it('should return 200 with a document count for existing indices', function () {
      return request.post('/kibana/foo-*/_count')
      .expect(200)
      .then(function (response) {
        expect(response.body.count).to.be(2);
      });
    });

    it('should support GET requests as well', function () {
      return request.get('/kibana/foo-*/_count')
        .expect(200)
        .then(function (response) {
          expect(response.body.count).to.be(2);
        });
    });

    it('should return 404 if a pattern matches no indices', function () {
      return request.post('/kibana/doesnotexist-*/_count')
      .expect(404);
    });

    it('should return 404 if a concrete index does not exist', function () {
      return request.post('/kibana/concrete/_count')
        .expect(404);
    });
  });
}
