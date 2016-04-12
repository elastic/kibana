import { Minimatch } from 'minimatch'

export class WildcardMatcher {
  constructor(wildcardPattern, emptyVal) {
    this.emptyVal = emptyVal;
    this.pattern = String(wildcardPattern || '*');
    this.matcher = new Minimatch(this.pattern, {
      noglobstar: true,
      dot: true,
      nocase: true,
      matchBase: true,
      nocomment: true
    })
  }

  match(candidate) {
    const empty = !candidate || candidate === this.emptyVal;
    if (empty && this.pattern === '*') {
      return true;
    }

    return this.matcher.match(candidate || '')
  }
}
