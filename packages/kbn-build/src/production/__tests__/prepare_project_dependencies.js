import expect from 'expect.js';
import { resolve, join } from 'path';

import { prepareExternalProjectDependencies } from '../prepare_project_dependencies';

// This is specifically a Mocha test instead of a Jest test because it's slow
// and more integration-y, as we're trying to not add very slow tests to our
// Jest unit tests.

const packagesFixtures = resolve(__dirname, 'fixtures/external_packages');

describe('prepareExternalProjectDependencies', function() {
  it('does nothing when Kibana `link:` dependencies', async () => {
    const projectPath = join(packagesFixtures, 'with_kibana_link_deps');

    try {
      await prepareExternalProjectDependencies(projectPath);
    } catch (e) {
      expect().fail(`Expected not to throw, but got [${e.message}]`);
    }
  });

  it('throws if non-Kibana `link` dependencies', async () => {
    const projectPath = join(packagesFixtures, 'with_other_link_deps');

    try {
      await prepareExternalProjectDependencies(projectPath);
      expect().fail('Expected "prepareProjectDependencies" to throw');
    } catch (e) {
      expect(e.message).to.eql(
        'This plugin is using `link:` dependencies for non-Kibana packages'
      );
    }
  });
});
