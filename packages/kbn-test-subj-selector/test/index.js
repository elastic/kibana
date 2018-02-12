const testSubjSelector = require('../');
const expect = require('expect.js');

describe('testSubjSelector()', function () {
  it('converts subjectSelectors to cssSelectors', function () {
    expect(testSubjSelector('foo bar')).to.eql('[data-test-subj~="foo"] [data-test-subj~="bar"]');
    expect(testSubjSelector('foo&bar')).to.eql('[data-test-subj~="foo"][data-test-subj~="bar"]');
    expect(testSubjSelector('foo & bar')).to.eql('[data-test-subj~="foo"][data-test-subj~="bar"]');
  });
});
