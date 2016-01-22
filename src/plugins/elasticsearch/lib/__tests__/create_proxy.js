const expect = require('expect.js');
const createProxy = require('../create_proxy');

describe('plugins/elasticsearch', function () {
  describe('lib/create_proxy', function () {

    describe('#createPath', function () {
      it('prepends /elasticsearch to route', function () {
        const path = createProxy.createPath('/wat');
        expect(path).to.equal('/elasticsearch/wat');
      });

      context('when arg does not start with a slash', function () {
        it('adds slash anyway', function () {
          const path = createProxy.createPath('wat');
          expect(path).to.equal('/elasticsearch/wat');
        });
      });
    });

  });
});
