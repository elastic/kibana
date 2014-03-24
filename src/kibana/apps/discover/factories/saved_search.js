define(function (require) {
  var app = require('modules').get('app/discover');
  var bind = require('lodash').bind;
  var assign = require('lodash').assign;
  var nextTick = require('utils/next_tick');

  app.factory('SavedSearch', function (configFile, courier, $q) {

    function SavedSearch(id) {
      var search = courier.createSource('search');
      search._doc = courier.createSource('doc')
        .index(configFile.kibanaIndex)
        .type('saved_searches')
        .id(id || void 0)
        .on('results', function onResults(resp) {
          if (!resp.found) {
            search._doc.removeListener('results', onResults);
            search.emit('noconfig', new Error('Unable to find that Saved Search...'));
          }

          search.set(resp._source.state);
          search.details = resp._source.details;
          assign(search.deatils, resp._source.details);

          if (!id) {
            id = resp._id;
            // it's no longer a phantom
            search.phantom = false;
          }

          if (!search.ready()) {
            search.ready(true);
            // allow the search to be fetched automatically
            search.enableAuthFetch();
          }
        });

      search._dynamicState.id = function () {
        return search._doc.get('id');
      };

      search.phantom = true;
      search.details = {
        name: '',
        hits: 0
      };

      search.ready = (function () {
        var queue = id ? [] : false;
        var err;
        return function (cb) {
          switch (typeof cb) {
          // check if we are ready yet
          case 'undefined':
            return !queue;

          // call or queue a function once ready
          case 'function':
            if (queue) {
              // queue will be false once complete
              queue.push(cb);
            } else {
              // always callback async
              nextTick(cb, err);
            }
            return;

          // indicate that we are ready, or there was a failure loading
          default:
            if (queue && cb) {
              if (cb instanceof Error) {
                err = cb;
              }

              // if queued functions are confused, and ask us if
              // we are ready, we should tell them yes
              var fns = queue;
              queue = false;

              // be sure to send out the error we got if there was one
              fns.forEach(function (fn) { fn(err); });
            }
          }
        };
      }());

      search.save = function () {
        var defer = $q.defer();

        search._doc.doIndex({
          details: search.details,
          state: search.toJSON()
        }, function (err, id) {
          if (err) return defer.reject(err);

          search._doc.id(id);
          defer.resolve();
        });

        return defer.promise;
      };

      if (!id) {
        // we have nothing left to load
        search.ready(true);
      } else {
        // before this search is fetched, it's config needs to be loaded
        search.disableAutoFetch();
        // get the config doc now
        search._doc.fetch();
      }
      return search;
    }
    return SavedSearch;
  });
});