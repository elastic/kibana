import override from '../override';
import expect from 'expect.js';

describe('override(target, source)', function () {

  it('should override the values form source to target', function () {
    let target = {
      test: {
        enable: true,
        host: ['host-01', 'host-02'],
        client: {
          type: 'sql'
        }
      }
    };
    let source = { test: { client: { type: 'nosql' } } };
    expect(override(target, source)).to.eql({
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
