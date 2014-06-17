define(function (require) {
  var _ = require('lodash');
  var errors = require('errors');

  return function (Promise, Private, es) {
    var pendingRequests = Private(require('components/courier/_pending_requests'));

    /**
     * Backend for doUpdate and doIndex
     * @param  {String} method - the client method to call
     * @param  {Boolean} validateVersion - should our knowledge
     *                                   of the the docs current version be sent to es?
     * @param  {String} body - HTTP request body
     */
    return function (method, validateVersion, body) {
      var doc = this;
      // straight assignment will causes undefined values
      var params = _.pick(this._state, ['id', 'type', 'index']);
      params.body = body;
      params.ignore = [409];

      if (validateVersion && params.id) {
        params.version = doc._getVersion();
      }

      return es[method](params)
      .then(function (resp) {
        if (resp.status === 409) throw new errors.VersionConflict(resp);

        doc._storeVersion(resp._version);
        doc.id(resp._id);

        // notify pending request for this same document that we have updates
        Promise.cast(method !== 'index' ? doc.fetch() : {
          _id: resp._id,
          _index: params.index,
          _source: body,
          _type: params.type,
          _version: doc._getVersion(),
          found: true
        }).then(function (fetchResp) {
          // use the key to compair sources
          var key = doc._versionKey();

          // clear the queue and filter out the removed items, pushing the
          // unmatched ones back in.
          pendingRequests.splice(0).filter(function (req) {
            var isDoc = req.source._getType() === 'doc';
            var keyMatches = isDoc && req.source._versionKey() === key;

            if (keyMatches) {
              // resolve the request with a copy of the response
              req.defer.resolve(_.cloneDeep(fetchResp));
              return;
            }

            // otherwise, put the request back into the queue
            pendingRequests.push(req);
          });
        });

        return resp._id;
      })
      .catch(function (err) {
        // cast the error
        throw new errors.RequestFailure(err);
      });
    };
  };
});