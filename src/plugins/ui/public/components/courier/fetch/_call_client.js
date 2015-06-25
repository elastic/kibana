define(function (require) {
  return function CourierFetchCallClient(Private, Promise, es, configFile, sessionId) {
    var _ = require('lodash');

    var isRequest = Private(require('components/courier/fetch/_is_request'));
    var mergeDuplicateRequests = Private(require('components/courier/fetch/_merge_duplicate_requests'));

    var ABORTED = Private(require('components/courier/fetch/_req_status')).ABORTED;
    var DUPLICATE = Private(require('components/courier/fetch/_req_status')).DUPLICATE;

    function callClient(strategy, requests) {
      // merging docs can change status to DUPLICATE, capture new statuses
      var statuses = mergeDuplicateRequests(requests);

      // get the actual list of requests that we will be fetching
      var executable = statuses.filter(isRequest);
      var execCount = executable.length;

      // resolved by respond()
      var esPromise;
      var defer = Promise.defer();

      // attach abort handlers, close over request index
      statuses.forEach(function (req, i) {
        if (!isRequest(req)) return;
        req.whenAborted(function () {
          requestWasAborted(req, i).catch(defer.reject);
        });
      });

      // handle a request being aborted while being fetched
      var requestWasAborted = Promise.method(function (req, i) {
        if (statuses[i] === ABORTED) {
          defer.reject(new Error('Request was aborted twice?'));
        }

        execCount -= 1;
        if (execCount > 0) {
          // the multi-request still contains other requests
          return;
        }

        if (esPromise && _.isFunction(esPromise.abort)) {
          esPromise.abort();
        }

        esPromise = ABORTED;

        return respond();
      });

      // for each respond with either the response or ABORTED
      var respond = function (responses) {
        responses = responses || [];
        return Promise.map(requests, function (req, i) {
          switch (statuses[i]) {
          case ABORTED:
            return ABORTED;
          case DUPLICATE:
            return req._uniq.resp;
          default:
            return responses[_.findIndex(executable, req)];
          }
        })
        .then(defer.resolve, defer.reject);
      };

      // Now that all of THAT^^^ is out of the way, lets actually
      // call out to elasticsearch
      Promise.map(executable, function (req) {
        return Promise.try(req.getFetchParams, void 0, req)
        .then(function (fetchParams) {
          return (req.fetchParams = fetchParams);
        });
      })
      .then(function (reqsFetchParams) {
        return strategy.reqsFetchParamsToBody(reqsFetchParams);
      })
      .then(function (body) {
        // while the strategy was converting, our request was aborted
        if (esPromise === ABORTED) {
          throw ABORTED;
        }

        return (esPromise = es[strategy.clientMethod]({
          timeout: configFile.shard_timeout,
          ignore_unavailable: true,
          preference: sessionId,
          body: body
        }));
      })
      .then(function (clientResp) {
        return strategy.getResponses(clientResp);
      })
      .then(respond)
      .catch(function (err) {
        if (err === ABORTED) respond();
        else defer.reject(err);
      });

      // return our promise, but catch any errors we create and
      // send them to the requests
      return defer.promise
      .catch(function (err) {
        requests.forEach(function (req, i) {
          if (statuses[i] !== ABORTED) {
            req.handleFailure(err);
          }
        });
      });
    }

    return callClient;
  };
});