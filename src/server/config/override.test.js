import override from './override';

describe('override(target, source)', function () {

  it('should override the values form source to target', function () {
    const target = {
      test: {
        enable: true,
        host: ['host-01', 'host-02'],
        client: {
          type: 'sql'
        }
      }
    };
    const source = { test: { client: { type: 'nosql' } } };
    expect(override(target, source)).toEqual({
      test: {
        enable: true,
        host: ['host-01', 'host-02'],
        client: {
          type: 'nosql'
        }
      }
    });
  });

});
