import _ from 'lodash';
import { StringUtils } from 'ui/utils/string_utils';

export class SavedObjectLoader {
  constructor(SavedObjectClass, savedObjectsClient, kbnUrl, options = {}) {
    const {
      type = SavedObjectClass.type,
      loaderProperties = {
        name: `${ type.toLowerCase() }s`,
        noun: StringUtils.upperFirst(type),
        nouns: `${ type.toLowerCase() }s`,
      },
      getUrl,
    } = options;

    this.Class = SavedObjectClass;
    this.savedObjectsClient = savedObjectsClient;
    this.kbnUrl = kbnUrl;

    this.type = type;
    this.loaderProperties = loaderProperties;
    if (getUrl) this.urlFor = getUrl;
  }

  /**
   * Retrieve a saved object by id. Returns a promise that completes when the object finishes
   * initializing.
   * @param {String} id
   * @returns {Promise<SavedObject>}
   */
  get(id) {
    return (new this.Class(id)).init();
  }

  /**
   *  Get the url for an object with it's id. Override with `options.getUrl`
   *  @param  {String} id
   *  @return {String}
   */
  urlFor(id) {
    return this.kbnUrl.eval(`#/${ this.type.toLowerCase() }/{{id}}`, { id: id });
  }

  delete(ids) {
    ids = !_.isArray(ids) ? [ids] : ids;

    const deletions = ids.map(id => {
      const savedObject = new this.Class(id);
      return savedObject.delete();
    });

    return Promise.all(deletions);
  }

  /**
   * Updates hit._source to contain an id and url field, and returns the updated
   * source object.
   * @param hit
   * @returns {hit._source} The modified hit._source object, with an id and url field.
   */
  mapHits(hit) {
    const source = hit._source;
    source.id = hit._id;
    source.url = this.urlFor(hit._id);
    return source;
  }

  scanAll() {
    return this.savedObjectsClient.scanAndMap(this.type, hit => this.mapHits(hit));
  }

  /**
   * TODO: Rather than use a hardcoded limit, implement pagination. See
   * https://github.com/elastic/kibana/issues/8044 for reference.
   *
   * @param searchString
   * @param size
   * @returns {Promise}
   */
  find(searchString, size = 100) {
    return this.savedObjectsClient.find(this.type, {
      filter: searchString,
      size
    })
    .then(resp => ({
      total: resp.hits.total,
      hits: resp.hits.hits.map((hit) => this.mapHits(hit))
    }));
  }
}
