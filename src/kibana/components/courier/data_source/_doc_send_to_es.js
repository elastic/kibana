define(function (require) {
  var _ = require('lodash');

  return function (Promise, es, $injector) {
    var docUpdated = $injector.invoke(require('./_doc_updated'));

    /**
     * Backend for doUpdate and doIndex
     * @param  {String} method - the client method to call
     * @param  {Boolean} validateVersion - should our knowledge
     *                                   of the the docs current version be sent to es?
     * @param  {String} body - HTTP request body
     */
    return function (courier, method, validateVersion, body) {
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
        if (resp.status === 409) throw new courier.errors.VersionConflict(resp);

        doc._storeVersion(resp._version);
        docUpdated(courier, doc, null);
        doc.id(resp._id);
        return resp._id;
      })
      .catch(function (err) {
        // cast the error
        throw new courier.errors.RequestFailure(err);
      });
    };
  };
});