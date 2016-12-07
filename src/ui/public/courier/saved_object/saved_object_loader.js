import _ from 'lodash';
import Scanner from 'ui/utils/scanner';
import { StringUtils } from 'ui/utils/string_utils';

// This is the only thing that gets injected into controllers
//module.service('savedDashboards', function (Promise, SavedDashboard, kbnIndex, es, kbnUrl) {
export function SavedObjectLoader(SavedObjectClass, kbnIndex, es, kbnUrl) {
  this.type = SavedObjectClass.type;
  this.Class = SavedObjectClass;

  const scanner = new Scanner(es, {
    index: kbnIndex,
    type: this.type.toLowerCase()
  });

  this.loaderProperties = {
    name: this.type.toLowerCase() + 's',
    noun: StringUtils.upperFirst(this.type),
    nouns: this.type.toLowerCase() + 's'
  };

  // Returns a single object by id.
  this.get = (id) => {
    // Returns a promise that contains a dashboard which is a subclass of docSource
    return (new this.Class(id)).init();
  };

  this.urlFor = function (id) {
    return kbnUrl.eval(`#/${this.type.toLowerCase()}/{{id}}`, {id: id});
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
