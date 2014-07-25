define(function (require) {
  return function FetchStrategyForDoc() {
    return {
      clientMethod: 'mget',

      /**
       * Turn a request into a flat "state"
       * @param  {[type]} req [description]
       * @return {[type]}     [description]
       */
      getSourceStateFromRequest: function (req) {
        return req.source._flatten();
      },

      /**
       * Flatten a series of requests into as ES request body
       * @param  {array} requests - an array of flattened requests
       * @return {string} - the request body
       */
      convertStatesToBody: function (states) {
        return {
          docs: states
        };
      },

      /**
       * Fetch the multiple responses from the ES Response
       * @param  {object} resp - The response sent from Elasticsearch
       * @return {array} - the list of responses
       */
      getResponses: function (resp) {
        return resp.docs;
      },

      /**
       * Resolve a single request using a single response from an msearch
       * @param  {object} req - The request object, with a defer and source property
       * @param  {object} resp - An object from the mget response's "docs" array
       * @return {Promise} - the promise created by responding to the request
       */
      resolveRequest: function (req, resp) {
        if (resp.found) {
          req.source._storeVersion(resp._version);
        } else {
          req.source._clearVersion();
        }
        return req.defer.resolve(resp);
      },

      /**
       * Get the doc requests from the courier that are ready to be fetched
       * @return {array} - The filtered request list, pulled from
       *                   the courier's _pendingRequests queue
       */
      getPendingRequests: function (pendingRequests) {
        return pendingRequests.splice(0).filter(function (req) {
          // filter by type first
          if (req.source._getType() !== 'doc') {
            pendingRequests.push(req);
            return;
          }

          // _getStoredVersion updates the internal
          // cache returned by _getVersion, so _getVersion
          // must be called first
          var version = req.source._getVersion();
          var storedVersion = req.source._getStoredVersion();

          // conditions that equal "fetch This DOC!"
          var unknownVersion = !version && !storedVersion;
          var versionMismatch = version !== storedVersion;
          var localVersionCleared = version && !storedVersion;

          if (unknownVersion || versionMismatch || localVersionCleared) return true;
          else pendingRequests.push(req);
        });
      }
    };
  };
});