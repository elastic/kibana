import Promise from 'bluebird';
import expect from 'expect.js';

const testPipeline = {
  processors: [{
    processor_id: 'processor1',
    type_id: 'convert',
    source_field: 'foo',
    target_field: 'foo',
    type: 'auto'
  }],
  input: { foo: '1234' }
};

export default function (scenarioManager, request) {
  describe('simulate - convert processor', () => {

    it('should return 400 for an invalid payload', () => {
      return Promise.all([
        // Convert processor requires source_field property
        request.post('/kibana/ingest/simulate')
        .send({
          input: {},
          processors: [{
            processor_id: 'processor1',
            type_id: 'convert',
            value: 'auto',
            source_field: 42,
            target_field: 'foo'
          }]
        })
        .expect(400)
      ]);
    });

    it('should return 200 for a valid simulate request', () => {
      return request.post('/kibana/ingest/simulate')
        .send(testPipeline)
        .expect(200);
    });

    it('should return a simulated output with the correct result for the given processor', function () {
      return request.post('/kibana/ingest/simulate')
        .send(testPipeline)
        .expect(200)
        .then(function (response) {
          expect(response.body[0].output.foo).to.be(1234);
        });
    });

    it('should enforce snake case', () => {
      return request.post('/kibana/ingest/simulate')
      .send({
        processors: [{
          processorId: 'processor1',
          typeId: 'convert',
          sourceField: 'foo',
          targetField: 'foo',
          type: 'string'
        }],
        input: {}
      })
      .expect(400);
    });

  });
}
