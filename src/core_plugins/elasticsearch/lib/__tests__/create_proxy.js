import expect from 'expect.js';
import createProxy from '../create_proxy';

describe('plugins/elasticsearch', function () {
  describe('lib/create_proxy', function () {
    describe('#createPath', function () {
      it('prepends /elasticsearch to route', function () {
        const path = createProxy.createPath('/foobar', '/wat');
        expect(path).to.equal('/foobar/wat');
      });

      it('ensures leading slash for prefix', function () {
        const path = createProxy.createPath('foobar', '/wat');
        expect(path).to.equal('/foobar/wat');
      });

      it('ensures leading slash for path', function () {
        const path = createProxy.createPath('/foobar', 'wat');
        expect(path).to.equal('/foobar/wat');
      });
    });
  });
});
