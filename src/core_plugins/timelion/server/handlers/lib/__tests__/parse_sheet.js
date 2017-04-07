const parseSheet = require('../parse_sheet');
const expect = require('chai').expect;

describe('timelion parse_sheet function', function () {

  it('does not allow whitespace used between two expressions', function () {
    const data = ['.es() .es(404)'];
    expect(function () {
      parseSheet(data);
    }).to.throw();
  });

  it('allows whitespace between two functions in a single expression', function () {
    const data = ['.es() .yaxis(1)'];
    expect(function () {
      parseSheet(data);
    }).to.not.throw();
  });

  it('allows whitespace in a query to ES', function () {
    const data = ['.es( indexPattern = ".logstash*", query="404")'];
    expect(function () {
      parseSheet(data);
    }).to.not.throw();
  });

  it('allows comma-delimited expressions', function () {
    const data = ['.es(), .es(404)'];
    expect(function () {
      parseSheet(data);
    }).to.not.throw();
  });
});
