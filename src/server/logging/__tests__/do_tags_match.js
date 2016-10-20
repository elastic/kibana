import expect from 'expect.js';

import { doTagsMatch } from '../do_tags_match';

describe('doTagsMatch helper', () => {
  it('returns false for non-objects', () => {
    expect(doTagsMatch(1, [])).to.be(false);
    expect(doTagsMatch('string', [])).to.be(false);
    expect(doTagsMatch(null, [])).to.be(false);
    expect(doTagsMatch(undefined, [])).to.be(false);
  });

  it('returns false when object does not have tags array', () => {
    expect(doTagsMatch({}, [])).to.be(false);
    expect(doTagsMatch({ tags: 'taga' }, ['taga'])).to.be(false);
  });

  it('returns false when tags do not match', () => {
    expect(doTagsMatch({ tags: ['a', 'b', 'c']}, ['b', 'c'])).to.be(false);
    expect(doTagsMatch({ tags: ['b', 'b', 'c']}, ['b', 'c'])).to.be(false);
    expect(doTagsMatch({ tags: ['b', 'b', 'c']}, ['b', 'c', 'a'])).to.be(false);
    expect(doTagsMatch({ tags: ['b', 'c']}, ['b', 'c', 'a'])).to.be(false);
    expect(doTagsMatch({ tags: []}, ['foo'])).to.be(false);
  });

  it('returns true when tags do match', () => {
    expect(doTagsMatch({ tags: ['a', 'b', 'c']}, ['a', 'b', 'c'])).to.be(true);
    expect(doTagsMatch({ tags: ['c', 'a', 'b']}, ['a', 'b', 'c'])).to.be(true);
  });
});
