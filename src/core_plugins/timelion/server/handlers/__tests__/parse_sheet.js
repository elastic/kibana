const chainRunnerFn = require('../chain_runner');
const tlConfig = require('../../series_functions/__tests__/fixtures/tlConfig.js')();

const expect = require('chai').expect;

describe('timelion parse_sheet function', function () {
  const chainRunner =  chainRunnerFn(tlConfig);

  async function parse(data) {
    const request = {
      sheet: data,
      time: {
        from: 'now-15m',
        to: 'now',
        mode: 'quick',
        interval: 'auto',
        timezone: 'Europe/Berlin'
      }
    };
    return await Promise.all(chainRunner.processRequest(request));
  }

  it('does not allow whitespace used between two expressions', async function () {
    const data = ['.es() .es(404)'];
    expect(function () {
      parse(data);
    }).to.throw();
  });

  it('allows whitespace between two functions in a single expression', function () {
    const data = ['.es() .yaxis(1)'];
    expect(function () {
      parse(data);
    }).to.not.throw();
  });

  it('allows whitespace in a query to ES', function () {
    const data = ['.es( index = "logstash*", q="404")'];
    expect(function () {
      parse(data);
    }).to.not.throw();
  });

  it('allows comma-delimited expressions', function () {
    const data = ['.es(), .es(404)'];
    expect(function () {
      parse(data);
    }).to.not.throw();
  });
});
