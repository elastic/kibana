/**
 * Retrieves the saved object represented by the panel and returns it, along with the appropriate
 * edit Url.
 * @param {Array.<SavedObjectLoader>} loaders - The available loaders for different panel types.
 * @param {PanelState} panel
 * @returns {Promise.<{savedObj: SavedObject, editUrl: String}>}
 */
export function loadSavedObject(loaders, panel) {
  const loader = loaders.find((loader) => loader.type === panel.type);
  if (!loader) {
    throw new Error(`No loader for object of type ${panel.type}`);
  }
  return loader.get(panel.id)
    .then(savedObj => ({ savedObj, editUrl: loader.urlFor(panel.id) }));
}
