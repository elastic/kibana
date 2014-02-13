define(function (require) {
  var _ = require('lodash');

  function Docs(courier) {
    // docs that we have let loose, and want to track
    var tracking = {};
    var watchers = {};

    function respId(getResp) {
      return [
        encodeURIComponent(getResp._index),
        encodeURIComponent(getResp._type),
        encodeURIComponent(getResp._id)
      ].join('/');
    }

    function change(id, updated) {
      if (watchers[id]) {
        var notify = function () {
          var oldVal = tracking[id]._source;
          tracking[id] = _.cloneDeep(update);
          watchers[id].forEach(function (watcher) {
            try {
              watcher(updated, oldVal);
            } catch (e) { console.error(e); }
          });
        };

        if (updated) {
          notify();
        } else {
          courier.get('client').get({

          });
        }
      }
    }

    function track(resp) {
      var id = respId(resp);
      var tracker = _.pick(resp, '_id', '_type', '_index', '_source');
      if (tracking[id] && equal(tracking[id]._source, resp)) return false;
      change(id, resp);
    }

    /**
     * add a function to be called when objects matching
     * this resp are changed
     * @param  {object} resp - Response like object, should contain _id, _type, and _index keys
     * @param  {[type]} onChange - Function to be called when changes are noticed
     */
    function watch(resp, onChange) {
      var id = respId(resp);
      if (!watchers[id]) watchers[id] = [];
      watchers[id].push(onChange);
    }

    function get(args, cb, onChange) {
      var client = courier.get('client');
      client.get(args, function (err, getResp) {
        if (err) return cb(err);
        watch(getResp, onChange);
        return cb(void 0, getResp);
      });
    }

    function index(args, cb) {
      var client = courier.get('client');

      client.index(args, function (err, indexResp) {
        if (err) return cb(err);
        delete indexResp.created;
        indexResp._source = args.body;
        track(indexResp);
        return cb(void 0, indexResp);
      });
    }

    function update(args, cb) {
      var client = courier.get('client');
      client.update(args, function (err, updateResp) {
        if (err) return cb(err);
        return cb(void 0, updateResp);
      });
    }

    this.watch = watch;
    this.get = get;
    this.index = index;
    this.set = index;
    this.update = update;
  }

  function equal(o1, o2) {
    /* jshint eqeqeq:false, forin:false */
    if (o1 === o2) return true;
    if (o1 === null || o2 === null) return false;
    if (o1 !== o1 && o2 !== o2) return true; // NaN === NaN
    var t1 = typeof o1, t2 = typeof o2, length, key, keySet;
    if (t1 == t2) {
      if (t1 == 'object') {
        if (_.isArray(o1)) {
          if (!_.isArray(o2)) return false;
          if ((length = o1.length) == o2.length) {
            for (key = 0; key < length; key++) {
              if (!equal(o1[key], o2[key])) return false;
            }
            return true;
          }
        } else if (_.isDate(o1)) {
          return _.isDate(o2) && o1.getTime() == o2.getTime();
        } else if (_.isRegExp(o1) && _.isRegExp(o2)) {
          return o1.toString() == o2.toString();
        } else {
          if (_.isArray(o2)) return false;
          keySet = {};
          for (key in o1) {
            if (_.isFunction(o1[key])) continue;
            if (!equal(o1[key], o2[key])) return false;
            keySet[key] = true;
          }
          for (key in o2) {
            if (!keySet.hasOwnProperty(key) &&
                o2[key] !== undefined &&
                !_.isFunction(o2[key])) return false;
          }
          return true;
        }
      }
    }
    return false;
  }

  return Docs;
});