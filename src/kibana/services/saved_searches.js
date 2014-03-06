define(function (require) {

  var module = require('modules').get('kibana/services');

  module.service('savedSearches', function (courier, configFile, $q) {
    this.get = function (id) {
      var docLoaded = id ? false : true;
      var doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('saved_searches')
        .id(id)
        .on('results', function (doc) {
          search.set(doc._source.state);

          // set the
          id = doc._id;
          if (!docLoaded) {
            docLoaded = true;
            search.enable();
          }
        });

      var search = courier.createSource('search');
      search.save = function () {
        var defer = $q.defer();

        doc.doIndex({
          state: search.toJSON()
        }, function (err, id) {
          if (err) return defer.reject(err);
          defer.resolve();
        });

        return defer.promise;
      };

      if (!docLoaded) search.disableFetch();
      return search;
    };

    this.create = this.get;
  });
});