import _ from 'lodash';
import Scanner from 'ui/utils/scanner';
import { StringUtils } from 'ui/utils/string_utils';

export function SavedObjectLoader(SavedObjectClass, kbnIndex, es, kbnUrl) {
  this.type = SavedObjectClass.type;
  this.Class = SavedObjectClass;

  const lowercaseType = this.type.toLowerCase();
  const scanner = new Scanner(es, {
    index: kbnIndex,
    type: lowercaseType
  });

  this.loaderProperties = {
    name: `${lowercaseType}s`,
    noun: StringUtils.upperFirst(this.type),
    nouns: `${lowercaseType}s`,
  };

  /**
   * Retrieve a saved object by id. Returns a promise that completes when the object finishes
   * initializing.
   * @param id
   * @returns {Promise<SavedObject>}
   */
  this.get = (id) => {
    return (new this.Class(id)).init();
  };

  this.urlFor = function (id) {
    return kbnUrl.eval(`#/${lowercaseType}/{{id}}`, {id: id});
  };

  this.delete = function (ids) {
    ids = !_.isArray(ids) ? [ids] : ids;
    return Promise.map(ids, (id) => {
      return (new this.Class(id)).delete();
    });
  };

  this.mapHits = (hit) => {
    const source = hit._source;
    source.id = hit._id;
    source.url = this.urlFor(hit._id);
    return source;
  };

  this.scanAll = (queryString, pageSize = 1000) => {
    return scanner.scanAndMap(queryString, {
      pageSize,
      docCount: Infinity
    }, (hit) => this.mapHits(hit));
  };

  this.find = (searchString, size = 100) => {
    let body;
    if (searchString) {
      body = {
        query: {
          simple_query_string: {
            query: searchString + '*',
            fields: ['title^3', 'description'],
            default_operator: 'AND'
          }
        }
      };
    } else {
      body = { query: {match_all: {}}};
    }

    return es.search({
      index: kbnIndex,
      type: this.type.toLowerCase(),
      body: body,
      size: size
    })
      .then((resp) => {
        return {
          total: resp.hits.total,
          hits: resp.hits.hits.map((hit) => this.mapHits(hit))
        };
      });
  };
};
