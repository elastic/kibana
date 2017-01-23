import { expect } from 'chai';
import replaceVars from '../replace_vars';

describe('replaceVars(str, args, vars)', () => {
  it('replaces vars with values', () => {
    const vars = { total: 100 };
    const args = { host: 'test-01' };
    const template = '# {{args.host}} {{total}}';
    expect(replaceVars(template, args, vars)).to.equal('# test-01 100');
  });
  it('replaces args override vars', () => {
    const vars = { total: 100, args: { test: 'foo-01' } };
    const args = { test: 'bar-01' };
    const template = '# {{args.test}} {{total}}';
    expect(replaceVars(template, args, vars)).to.equal('# bar-01 100');
  });
  it('returns original string if error', () => {
    const vars = { total: 100 };
    const args = { host: 'test-01' };
    const template = '# {{args.host}} {{total';
    expect(replaceVars(template, args, vars)).to.equal('# {{args.host}} {{total');
  });
});
