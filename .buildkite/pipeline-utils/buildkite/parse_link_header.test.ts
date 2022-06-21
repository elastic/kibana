import { expect } from 'chai';
import parseLinkHeader from './parse_link_header';

describe('parseLinkHeader', () => {
  it('should parse link header', () => {
    const result = parseLinkHeader(
      '<https://api.buildkite.com/v2/organizations/elastic/agents?page=2&per_page=1>; rel="next", <https://api.buildkite.com/v2/organizations/elastic/agents?page=5&per_page=1>; rel="last"',
    );

    expect(result).to.eql({
      last: 'https://api.buildkite.com/v2/organizations/elastic/agents?page=5&per_page=1',
      next: 'https://api.buildkite.com/v2/organizations/elastic/agents?page=2&per_page=1',
    });
  });
});
