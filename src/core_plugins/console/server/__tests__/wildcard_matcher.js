import { WildcardMatcher } from '../wildcard_matcher';

function should(candidate, ...constructorArgs) {
  if (!new WildcardMatcher(...constructorArgs).match(candidate)) {
    throw new Error(`Expected pattern ${[...constructorArgs]} to match ${candidate}`);
  }
}

function shouldNot(candidate, ...constructorArgs) {
  if (new WildcardMatcher(...constructorArgs).match(candidate)) {
    throw new Error(`Expected pattern ${[...constructorArgs]} to not match ${candidate}`);
  }
}


describe('WildcardMatcher', function () {
  describe('pattern = *', function () {
    it('matches http', () => should('http', '*'));
    it('matches https', () => should('https', '*'));
    it('matches nothing', () => should('', '*'));
    it('does not match /', () => shouldNot('/', '*'));
    it('matches localhost', () => should('localhost', '*'));
    it('matches a path', () => should('/index/type/_search', '*'));

    describe('defaultValue = /', function () {
      it('matches /', () => should('/', '*', '/'));
    });
  });

  describe('pattern = http', function () {
    it('matches http', () => should('http', 'http'));
    it('does not match https', () => shouldNot('https', 'http'));
    it('does not match nothing', () => shouldNot('', 'http'));
    it('does not match localhost', () => shouldNot('localhost', 'http'));
    it('does not match a path', () => shouldNot('/index/type/_search', 'http'));
  });

  describe('pattern = 560{1..9}', function () {
    it('does not match http', () => shouldNot('http', '560{1..9}'));
    it('does not matches 5600', () => shouldNot('5600', '560{1..9}'));
    it('matches 5601', () => should('5601', '560{1..9}'));
    it('matches 5602', () => should('5602', '560{1..9}'));
    it('matches 5603', () => should('5603', '560{1..9}'));
    it('matches 5604', () => should('5604', '560{1..9}'));
    it('matches 5605', () => should('5605', '560{1..9}'));
    it('matches 5606', () => should('5606', '560{1..9}'));
    it('matches 5607', () => should('5607', '560{1..9}'));
    it('matches 5608', () => should('5608', '560{1..9}'));
    it('matches 5609', () => should('5609', '560{1..9}'));
    it('does not matches 5610', () => shouldNot('5610', '560{1..9}'));
  });
});
