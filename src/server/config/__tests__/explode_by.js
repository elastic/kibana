import explodeBy from '../explode_by';
import expect from 'expect.js';

describe('explode_by(dot, flatObject)', function () {

  it('should explode a flatten object with dots', function () {
    let flatObject = {
      'test.enable': true,
      'test.hosts': ['host-01', 'host-02']
    };
    expect(explodeBy('.', flatObject)).to.eql({
      test: {
        enable: true,
        hosts: ['host-01', 'host-02']
      }
    });
  });

  it('should explode a flatten object with slashes', function () {
    let flatObject = {
      'test/enable': true,
      'test/hosts': ['host-01', 'host-02']
    };
    expect(explodeBy('/', flatObject)).to.eql({
      test: {
        enable: true,
        hosts: ['host-01', 'host-02']
      }
    });
  });

});
