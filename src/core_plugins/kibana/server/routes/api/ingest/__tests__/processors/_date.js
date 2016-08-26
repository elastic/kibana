import Promise from 'bluebird';
import expect from 'expect.js';
import moment from 'moment';

const testPipeline = {
  processors: [{
    processor_id: 'processor1',
    type_id: 'date',
    source_field: 'dob',
    target_field: 'dob',
    formats: ['Custom'],
    timezone: 'Etc/UTC',
    locale: 'ENGLISH',
    custom_format: 'MM/dd/yyyy'
  }],
  input: { dob: '07/05/1979' }
};

export default function (scenarioManager, request) {
  describe('simulate - date processor', () => {

    it('should return 400 for an invalid payload', () => {
      return Promise.all([
        // Date processor requires source_field property
        request.post('/kibana/ingest/simulate')
        .send({
          input: { dob: '07/05/1979' },
          processors: [{
            processor_id: 'processor1',
            type_id: 'date',
            source_field: 42,
            target_field: 'dob',
            formats: 'Custom',
            timezone: 'Etc/UTC',
            locale: 'ENGLISH',
            custom_format: 'MM/dd/yyyy'
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
          expect(response.body[0].output.dob).to.be('1979-07-05T00:00:00.000Z');
        });
    });

    it('should return a date in ISO 8601 format', function () {
      return request.post('/kibana/ingest/simulate')
        .send(testPipeline)
        .expect(200)
        .then(function (response) {
          expect(moment(response.body[0].output.dob, moment.ISO_8601).isValid()).to.be(true);
        });
    });

    it('should enforce snake case', () => {
      return request.post('/kibana/ingest/simulate')
      .send({
        processors: [{
          processorId: 'processor1',
          typeId: 'date',
          sourceField: 'dob',
          targetField: 'dob',
          formats: ['Custom'],
          timezone: 'Etc/UTC',
          locale: 'ENGLISH',
          customFormat: 'MM/dd/yyyy'
        }],
        input: { dob: '07/05/1979' }
      })
      .expect(400);
    });

  });
}
