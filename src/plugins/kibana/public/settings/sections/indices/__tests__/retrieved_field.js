var expect = require('expect.js');

define(function (require) {
  var isRetrieved = require('src/plugins/kibana/public/settings/sections/indices/retrieved_field');

  describe('Settings', function () {
    describe('Indices', function () {
      describe('isRetrieved(sourceFiltering, name)', function () {
        it('should be a function', function () {
          expect(isRetrieved).to.be.a(Function);
        });

        it('should retrieve john', function () {
          var sourceFiltering = {
            include: 'john'
          };

          expect(isRetrieved(sourceFiltering, 'john')).to.be(true);
        });

        it('should not retrieve connor', function () {
          var sourceFiltering = {
            exclude: 'connor'
          };

          expect(isRetrieved(sourceFiltering, 'connor')).to.be(false);
        });

        it('should retrieve connor', function () {
          var sourceFiltering = {
            exclude: '*.connor'
          };

          expect(isRetrieved(sourceFiltering, 'connor')).to.be(true);
          expect(isRetrieved(sourceFiltering, 'john.connor')).to.be(false);
        });

        it('should not retrieve neither john nor connor', function () {
          var sourceFiltering = {
            exclude: [ 'john', 'connor' ]
          };

          expect(isRetrieved(sourceFiltering, 'connor')).to.be(false);
          expect(isRetrieved(sourceFiltering, 'john')).to.be(false);
          expect(isRetrieved(sourceFiltering, 'toto')).to.be(true);
        });

        it('should not retrieve john.*.connor', function () {
          var sourceFiltering = {
            exclude: 'john.*.connor'
          };

          expect(isRetrieved(sourceFiltering, 'john.j.connor')).to.be(false);
          expect(isRetrieved(sourceFiltering, 'john.t.connor')).to.be(false);
          expect(isRetrieved(sourceFiltering, 'john.j.watterson')).to.be(true);
        });
      });
    });
  });
});
