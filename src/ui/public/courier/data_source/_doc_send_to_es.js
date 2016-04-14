define(function (require) {
  let _ = require('lodash');
  let errors = require('ui/errors');

  return function (Promise, Private, es) {
    let requestQueue = Private(require('ui/courier/_request_queue'));
    let courierFetch = Private(require('ui/courier/fetch/fetch'));

    /**
     * Backend for doUpdate and doIndex
     * @param  {String} method - the client method to call
     * @param  {Boolean} validateVersion - should our knowledge
     *                                   of the the docs current version be sent to es?
     * @param  {String} body - HTTP request body
     */
    return function (method, validateVersion, body, ignore) {
      let doc = this;
      // straight assignment will causes undefined values
      let params = _.pick(this._state, ['id', 'type', 'index']);
      params.body = body;
      params.ignore = ignore || [409];

      if (validateVersion && params.id) {
        params.version = doc._getVersion();
      }

      return es[method](params)
      .then(function (resp) {
        if (resp.status === 409) throw new errors.VersionConflict(resp);

        doc._storeVersion(resp._version);
        doc.id(resp._id);

        let docFetchProm;
        if (method !== 'index') {
          docFetchProm = doc.fetch();
        } else {
          // we already know what the response will be
          docFetchProm = Promise.resolve({
            _id: resp._id,
            _index: params.index,
            _source: body,
            _type: params.type,
            _version: doc._getVersion(),
            found: true
          });
        }

        // notify pending request for this same document that we have updates
        docFetchProm.then(function (fetchResp) {
          // use the key to compair sources
          let key = doc._versionKey();

          // clear the queue and filter out the removed items, pushing the
          // unmatched ones back in.
          let respondTo = requestQueue.splice(0).filter(function (req) {
            let isDoc = req.source._getType() === 'doc';
            let keyMatches = isDoc && req.source._versionKey() === key;

            // put some request back into the queue
            if (!keyMatches) {
              requestQueue.push(req);
              return false;
            }

            return true;
          });

          return courierFetch.fakeFetchThese(respondTo, respondTo.map(function () {
            return _.cloneDeep(fetchResp);
          }));
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
