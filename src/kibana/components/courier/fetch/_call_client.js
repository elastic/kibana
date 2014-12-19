define(function (require) {
  return function CourierFetchCallClient(Private, Promise, es, configFile, sessionId) {
    var _ = require('lodash');

    var isRequest = Private(require('components/courier/fetch/_is_request'));
    var mergeDuplicateRequests = Private(require('components/courier/fetch/_merge_duplicate_requests'));

    var ABORTED = Private(require('components/courier/fetch/_req_status')).ABORTED;
    var DUPLICATE = Private(require('components/courier/fetch/_req_status')).DUPLICATE;
    var INCOMPLETE = Private(require('components/courier/fetch/_req_status')).INCOMPLETE;

    function callClient(strategy, requests) {
      var statuses = mergeDuplicateRequests(requests);

      var executable = statuses.filter(isRequest);
      var execCount = executable.length;

      var esPromise;
      var defer = Promise.defer();

      statuses.forEach(function (req, i) {
        if (!isRequest(req)) return;
        req.whenAborted(function () {
          requestWasAborted(req, i).catch(defer.reject);
        });
      });

      var requestWasAborted = Promise.method(function (req, i) {
        if (statuses[i] === ABORTED) {
          defer.reject(new Error('Request was aborted twice?'));
        }

        execCount -= 1;
        if (execCount > 0) {
          return;
        }

        if (esPromise) {
          // cancel active request
          esPromise.abort();
        } else {
          // prevent request creation
          esPromise = false;
        }

        return respond();
      });

      var respond = function (responses) {
        responses = responses || [];
        return Promise.map(requests, function (req, i) {
          switch (statuses[i]) {
          case ABORTED:
            return ABORTED;
          case DUPLICATE:
            return _.cloneDeep(req._uniq.resp);
          default:
            return responses[_.findIndex(executable, req)];
          }
        })
        .then(defer.resolve, defer.reject);
      };

      Promise.resolve(strategy.convertReqsToBody(executable))
      .then(function (body) {
        if (esPromise != null) {
          throw ABORTED;
        }

        return (esPromise = es[strategy.clientMethod]({
          timeout: configFile.shard_timeout,
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

      return defer.promise.catch(function (err) {
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