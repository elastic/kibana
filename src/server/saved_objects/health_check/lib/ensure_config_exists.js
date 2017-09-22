import { getExistingConfig } from './get_existing_config';
import { getUpgradeableConfig } from './get_upgradeable_config';

export async function ensureConfigExists(options) {
  const {
    savedObjectsClient,
    version,
    buildNum,
    log,
  } = options;

  // first, check for an existing config
  const existing = await getExistingConfig({ savedObjectsClient, version });
  if (existing) {
    return;
  }

  // next, try to upgrade an older config
  const upgradeable = await getUpgradeableConfig({ savedObjectsClient, version });
  if (upgradeable) {
    log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: upgradeable.id,
      newVersion: version
    });

    await savedObjectsClient.create(
      'config',
      {
        ...upgradeable.attributes,
        buildNum
      },
      { id: version }
    );

    return;
  }

  // if all else fails, create a new SavedConfig
  await savedObjectsClient.create(
    'config',
    { buildNum },
    { id: version }
  );
}
