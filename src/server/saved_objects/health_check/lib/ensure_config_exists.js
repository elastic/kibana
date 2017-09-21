import { isConfigVersionUpgradeable } from './is_config_version_upgradeable';

export async function ensureConfigExists(options) {
  const {
    savedObjectsClient,
    version,
    buildNum,
    log,
  } = options;

  const { saved_objects: savedConfigs } = await savedObjectsClient.find({
    type: 'config',
    page: 1,
    perPage: 1000,
    sortField: 'buildNum',
    sortOrder: 'desc'
  });

  async function create(attributes) {
    await savedObjectsClient.create('config', attributes, { id: version });
  }

  // only look for existing configs if kibana's version is not `@@version`
  const existing = version === '@@version'
    ? null
    : savedConfigs.find(savedConfig => savedConfig.id === version);

  // config already exists, our work is done
  if (existing) {
    return;
  }

  // try to find a config that we can upgrade
  const upgradeable = savedConfigs.find(savedConfig => (
    isConfigVersionUpgradeable(savedConfig.id, version)
  ));

  // if there is nothing to upgrade just create a new one
  if (!upgradeable) {
    await create({ buildNum });
    return;
  }

  // it's upgradeing time!
  log(['plugin', 'elasticsearch'], {
    tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
    prevVersion: upgradeable.id,
    newVersion: version
  });

  await create({
    ...upgradeable.attributes,
    buildNum
  });
}
