import { resolve, join } from 'path';

import { prepareExternalProjectDependencies } from './prepare_project_dependencies';

const packagesFixtures = resolve(__dirname, '__fixtures__/external_packages');

test('does nothing when Kibana `link:` dependencies', async () => {
  const projectPath = join(packagesFixtures, 'with_kibana_link_deps');

  // We're checking for undefined, but we don't really care about what's
  // returned, we only care about it resolving.
  await expect(
    prepareExternalProjectDependencies(projectPath)
  ).resolves.toBeUndefined();
});

test('throws if non-Kibana `link` dependencies', async () => {
  const projectPath = join(packagesFixtures, 'with_other_link_deps');

  await expect(prepareExternalProjectDependencies(projectPath)).rejects.toThrow(
    'This plugin is using `link:` dependencies for non-Kibana packages'
  );
});
