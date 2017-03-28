import expect from 'expect.js';

export default () => {
  describe('app one', () => {
    before(() => {
      console.log('$BEFORE$');
    });

    it('$TESTNAME$', () => {
      expect(1).to.be(1);
      console.log('$INTEST$');
    });

    after(() => {
      console.log('$AFTER$');
    });
  });
};
