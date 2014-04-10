define(function (require) {
  return function (Promise) {
    /**
     * Notify other docs that docs like this one have been updated
     * @param  {DocSource} doc - the doc that was updated, used to match other listening parties
     * @return {undefined}
     */
    return function (courier, doc, body) {
      var key = doc._versionKey();

      if (!body) body = doc.fetch();

      // filter out the matching requests from the _pendingRequests queue
      var pending = courier._pendingRequests;
      pending.splice(0).filter(function (req) {
        var isDoc = req.source._getType() === 'doc';
        var keyMatches = isDoc && req.source._versionKey() === key;

        if (!keyMatches) {
          // put it back into the pending queue
          pending.push(req);
          return false;
        }

        Promise.cast(body).then(req.defer.resolve);
      });
    };
  };
});