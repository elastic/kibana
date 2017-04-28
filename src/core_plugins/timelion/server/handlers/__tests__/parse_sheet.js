const parseSheet = require('../lib/parse_sheet');

const expect = require('chai').expect;

describe('timelion parse_sheet function', function () {
  it(`doesn't split expressions on whitespace`, async function () {
    const data = ['.es() .es(404)'];
    const ast = parseSheet(data);

    const expressions = ast[0];
    expect(expressions.length).to.equal(1);
    expect(expressions[0].type).to.equal('chain');
  });

  it('splits expressions on commas', function () {
    const data = ['.es(), .es(404)'];
    const ast = parseSheet(data);

    const expressions = ast[0];
    expect(expressions.length).to.equal(2);
    expect(expressions[0].type).to.equal('chain');
    expect(expressions[1].type).to.equal('chain');
  });

  it('splits expressions on newlines', function () {
    const data = [`.es()\n\r ,\n\r .es(404)`];
    const ast = parseSheet(data);

    const expressions = ast[0];
    expect(expressions.length).to.equal(2);
    expect(expressions[0].type).to.equal('chain');
    expect(expressions[1].type).to.equal('chain');
  });
});
