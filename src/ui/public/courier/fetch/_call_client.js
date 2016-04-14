define(function (require) {
  return function CourierFetchCallClient(Private, Promise, es, esShardTimeout, sessionId) {
    let _ = require('lodash');

    let isRequest = Private(require('ui/courier/fetch/_is_request'));
    let mergeDuplicateRequests = Private(require('ui/courier/fetch/_merge_duplicate_requests'));

    let ABORTED = Private(require('ui/courier/fetch/_req_status')).ABORTED;
    let DUPLICATE = Private(require('ui/courier/fetch/_req_status')).DUPLICATE;

    function callClient(strategy, requests) {
      // merging docs can change status to DUPLICATE, capture new statuses
      let statuses = mergeDuplicateRequests(requests);

      // get the actual list of requests that we will be fetching
      let executable = statuses.filter(isRequest);
      let execCount = executable.length;

      if (!execCount) return Promise.resolve([]);

      // resolved by respond()
      let esPromise;
      let defer = Promise.defer();

      // for each respond with either the response or ABORTED
      let respond = function (responses) {
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
        .then(
          (res) => defer.resolve(res),
          (err) => defer.reject(err)
        );
      };


      // handle a request being aborted while being fetched
      let requestWasAborted = Promise.method(function (req, i) {
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


      // attach abort handlers, close over request index
      statuses.forEach(function (req, i) {
        if (!isRequest(req)) return;
        req.whenAborted(function () {
          requestWasAborted(req, i).catch(defer.reject);
        });
      });


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
          timeout: esShardTimeout,
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
