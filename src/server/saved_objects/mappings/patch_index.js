import { getMissingRootPropertiesFromEs } from './lib';

export async function patchIndex(options) {
  const {
    log,
    index,
    callCluster,
    mappings
  } = options;

  const missingProperties = await getMissingRootPropertiesFromEs({
    index,
    callCluster,
    mappings,
  });

  const missingPropertyNames = Object.keys(missingProperties);
  if (!missingPropertyNames.length) {
    // all expected properties are in current mapping
    return;
  }

  // log about new properties
  log(['info', 'elasticsearch'], {
    tmpl: `Adding mappings to kibana index for SavedObject types "<%= names.join('", "') %>"`,
    names: missingPropertyNames
  });

  // add the new properties to the index mapping
  await callCluster('indices.putMapping', {
    index,
    type: mappings.getRootType(),
    body: {
      properties: missingProperties
    },
    update_all_types: true
  });
}
