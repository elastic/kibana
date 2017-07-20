import expect from 'expect.js';
import { join, relative, resolve } from 'path';
import readYamlConfig from '../read_yaml_config';

function fixture(name) {
  return resolve(__dirname, 'fixtures', name);
}

describe('cli/serve/read_yaml_config', function () {
  it('reads a single config file', function () {
    const config = readYamlConfig(fixture('one.yml'));

    expect(config).to.eql({
      foo: 1,
      bar: true,
    });
  });

  it('reads and merged multiple config file', function () {
    const config = readYamlConfig([
      fixture('one.yml'),
      fixture('two.yml')
    ]);

    expect(config).to.eql({
      foo: 2,
      bar: true,
      baz: 'bonkers'
    });
  });

  describe('different cwd()', function () {
    const oldCwd = process.cwd();
    const newCwd = join(oldCwd, '..');

    before(function () {
      process.chdir(newCwd);
    });

    it('resolves relative files based on the cwd', function () {
      const relativePath = relative(newCwd, fixture('one.yml'));
      const config = readYamlConfig(relativePath);
      expect(config).to.eql({
        foo: 1,
        bar: true,
      });
    });

    it('fails to load relative paths, not found because of the cwd', function () {
      expect(function () {
        readYamlConfig(relative(oldCwd, fixture('one.yml')));
      }).to.throwException(/ENOENT/);
    });

    after(function () {
      process.chdir(oldCwd);
    });
  });
});
