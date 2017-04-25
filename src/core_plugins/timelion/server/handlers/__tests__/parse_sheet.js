const parseSheet = require('../lib/parse_sheet');

const expect = require('chai').expect;

describe('timelion parse_sheet function', function () {

  it('does not allow whitespace used between two expressions', async function () {
    const data = ['.es() .es(404)'];
    const ast = parseSheet(data);

    expect(ast[0].length).to.equal(1);
    expect(ast[0][0].type).to.equal('chain');
  });

  it('allows comma-delimited expressions', function () {
    const data = ['.es(), .es(404)'];
    const ast = parseSheet(data);

    expect(ast[0].length).to.equal(2);
    expect(ast[0][0].type).to.equal('chain');
    expect(ast[0][1].type).to.equal('chain');
  });

  it('allows new line for white space', function () {
    const data = [`.es()\n\r ,\n\r .es(404)`];
    const ast = parseSheet(data);
    expect(ast[0].length).to.equal(2);
    expect(ast[0][0].type).to.equal('chain');
    expect(ast[0][1].type).to.equal('chain');
  });
});
