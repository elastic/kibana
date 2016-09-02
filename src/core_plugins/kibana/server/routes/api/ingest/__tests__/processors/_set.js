import Promise from 'bluebird';
import expect from 'expect.js';

const testPipeline = {
  processors: [{
    processor_id: 'processor1',
    type_id: 'set',
    target_field: 'foo',
    value: 'bar'
  }],
  input: {}
};

export default function (scenarioManager, request) {
  describe('simulate - set processor', function simulatePipeline() {

    it('should return 400 for an invalid payload', function invalidPayload() {
      return Promise.all([
        // Set processor requires targetField property
        request.post('/kibana/ingest/simulate')
        .send({
          input: {},
          processors: [{
            processor_id: 'processor1',
            type_id: 'set',
            value: 'bar',
            target_field: 42
          }]
        })
        .expect(400)
      ]);
    });

    it('should return 200 for a valid simulate request', function validSetSimulate() {
      return request.post('/kibana/ingest/simulate')
        .send(testPipeline)
        .expect(200);
    });

    it('should return a simulated output with the correct result for the given processor', function () {
      return request.post('/kibana/ingest/simulate')
        .send(testPipeline)
        .expect(200)
        .then(function (response) {
          expect(response.body[0].output.foo).to.be.equal('bar');
        });
    });

    it('should enforce snake case', function setSimulateSnakeCase() {
      return request.post('/kibana/ingest/simulate')
      .send({
        processors: [{
          processorId: 'processor1',
          typeId: 'set',
          targetField: 'foo',
          value: 'bar'
        }],
        input: {}
      })
      .expect(400);
    });

  });
}
