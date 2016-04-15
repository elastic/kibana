import expect from 'expect.js';
import { join, relative, resolve } from 'path';
import readYamlConfig from '../read_yaml_config';
import sinon from 'auto-release-sinon';

function fixture(name) {
  return resolve(__dirname, 'fixtures', name);
}

describe('cli/serve/read_yaml_config', function () {
  it('reads a single config file', function () {
    const config = readYamlConfig(fixture('one.yml'));

    expect(readYamlConfig(fixture('one.yml'))).to.eql({
      foo: 1,
      bar: true,
    });
  });

  it('reads and merged mulitple config file', function () {
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

  context('different cwd()', function () {
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

  context('stubbed stdout', function () {
    let stub;

    beforeEach(function () {
      stub = sinon.stub(process.stdout, 'write');
    });

    context('deprecated settings', function () {
      it('warns about deprecated settings', function () {
        readYamlConfig(fixture('deprecated.yml'));
        sinon.assert.calledOnce(stub);
        expect(stub.firstCall.args[0]).to.match(/deprecated/);
        stub.restore();
      });

      it('only warns once about deprecated settings', function () {
        readYamlConfig(fixture('deprecated.yml'));
        readYamlConfig(fixture('deprecated.yml'));
        readYamlConfig(fixture('deprecated.yml'));
        sinon.assert.notCalled(stub); // already logged in previous test
        stub.restore();
      });
    });

    context('legacy settings', function () {
      it('warns about deprecated settings', function () {
        readYamlConfig(fixture('legacy.yml'));
        sinon.assert.calledOnce(stub);
        expect(stub.firstCall.args[0]).to.match(/has been replaced/);
        stub.restore();
      });

      it('only warns once about legacy settings', function () {
        readYamlConfig(fixture('legacy.yml'));
        readYamlConfig(fixture('legacy.yml'));
        readYamlConfig(fixture('legacy.yml'));
        sinon.assert.notCalled(stub); // already logged in previous test
        stub.restore();
      });
    });
  });
});
