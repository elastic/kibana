/**
 *  Get the savedObject for the config if it exists
 *  @param  {SavedObjectsClient} savedObjectsClient
 *  @param  {string} version
 *  @return {Promise<SavedConfig|undefined>}
 */
export async function getExistingConfig({ savedObjectsClient, version }) {
  if (version === '@@version') {
    return undefined;
  }

  try {
    return await savedObjectsClient.get('config', version);
  } catch (error) {
    if (savedObjectsClient.errors.isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}
