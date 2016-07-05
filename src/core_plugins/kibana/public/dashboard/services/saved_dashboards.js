import _ from 'lodash';
import Scanner from 'ui/utils/scanner';
import 'plugins/kibana/dashboard/services/_saved_dashboard';
import uiModules from 'ui/modules';
const module = uiModules.get('app/dashboard');

// bring in the factory


// Register this service with the saved object registry so it can be
// edited by the object editor.
require('plugins/kibana/management/saved_object_registry').register({
  service: 'savedDashboards',
  title: 'dashboards'
});

// This is the only thing that gets injected into controllers
module.service('savedDashboards', function (Promise, SavedDashboard, kbnIndex, es, kbnUrl) {
  const scanner = new Scanner(es, {
    index: kbnIndex,
    type: 'dashboard'
  });

  this.type = SavedDashboard.type;
  this.Class = SavedDashboard;


  this.loaderProperties = {
    name: 'dashboards',
    noun: 'Dashboard',
    nouns: 'dashboards'
  };

  // Returns a single dashboard by ID, should be the name of the dashboard
  this.get = function (id) {
    // Returns a promise that contains a dashboard which is a subclass of docSource
    return (new SavedDashboard(id)).init();
  };

  this.urlFor = function (id) {
    return kbnUrl.eval('#/dashboard/{{id}}', {id: id});
  };

  this.delete = function (ids) {
    ids = !_.isArray(ids) ? [ids] : ids;
    return Promise.map(ids, function (id) {
      return (new SavedDashboard(id)).delete();
    });
  };

  this.scanAll = function (queryString, pageSize = 1000) {
    return scanner.scanAndMap(queryString, {
      pageSize,
      docCount: Infinity
    }, (hit) => this.mapHits(hit));
  };

  this.mapHits = function (hit) {
    const source = hit._source;
    source.id = hit._id;
    source.url = this.urlFor(hit._id);
    return source;
  };

  this.find = function (searchString, size = 100) {
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
      type: 'dashboard',
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
});
