import _ from 'lodash';
import { Scanner } from 'ui/utils/scanner';
import { StringUtils } from 'ui/utils/string_utils';
import { SavedObjectsClient } from 'ui/saved_objects';

export class SavedObjectLoader {
  constructor(SavedObjectClass, kbnIndex, esAdmin, kbnUrl, $http) {
    this.type = SavedObjectClass.type;
    this.Class = SavedObjectClass;
    this.lowercaseType = this.type.toLowerCase();
    this.kbnIndex = kbnIndex;
    this.kbnUrl = kbnUrl;
    this.esAdmin = esAdmin;

    this.scanner = new Scanner(esAdmin, {
      index: kbnIndex,
      type: this.lowercaseType
    });

    this.loaderProperties = {
      name: `${ this.lowercaseType }s`,
      noun: StringUtils.upperFirst(this.type),
      nouns: `${ this.lowercaseType }s`,
    };

    this.savedObjectsClient = new SavedObjectsClient($http);
  }

  /**
   * Retrieve a saved object by id. Returns a promise that completes when the object finishes
   * initializing.
   * @param id
   * @returns {Promise<SavedObject>}
   */
  get(id) {
    return (new this.Class(id)).init();
  }

  urlFor(id) {
    return this.kbnUrl.eval(`#/${ this.lowercaseType }/{{id}}`, { id: id });
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
   * Updates source to contain an id and url field, and returns the updated
   * source object.
   * @param source
   * @param id
   * @returns {source} The modified source object, with an id and url field.
   */
  mapHitSource(source, id) {
    source.id = id;
    source.url = this.urlFor(id);
    return source;
  }

  /**
   * Updates hit._source to contain an id and url field, and returns the updated
   * source object.
   * @param hit
   * @returns {hit._source} The modified hit._source object, with an id and url field.
   */
  mapHits(hit) {
    return this.mapHitSource(hit._source, hit._id);
  }

  scanAll(queryString, pageSize = 1000) {
    return this.scanner.scanAndMap(queryString, {
      pageSize,
      docCount: Infinity
    }, (hit) => this.mapHits(hit));
  }

  /**
   * Updates hit._attributes to contain an id and url field, and returns the updated
   * attributes object.
   * @param hit
   * @returns {hit._attributes} The modified hit._attributes object, with an id and url field.
   */
  mapSavedObjectApiHits(hit) {
    return this.mapHitSource(hit._attributes, hit.id);
  }

  /**
   * TODO: Rather than use a hardcoded limit, implement pagination. See
   * https://github.com/elastic/kibana/issues/8044 for reference.
   *
   * @param searchString
   * @param size
   * @returns {Promise}
   */
  find(search, size = 100) {
    return this.savedObjectsClient.find(
      {
        type: this.lowercaseType,
        search,
        perPage: size,
        page: 1,
        searchFields: ['title^3', 'description']
      }).then((resp) => {
        return {
          total: resp.total,
          hits: resp.savedObjects.map((savedObject) => this.mapSavedObjectApiHits(savedObject))
        };
      });
  }
}
