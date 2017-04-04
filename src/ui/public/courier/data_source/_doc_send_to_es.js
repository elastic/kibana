/**
 * @name _doc_send_to_es
 *
 * NOTE: Depends upon the es object to make ES requests, and also interacts
 * with courier objects.
 */

import _ from 'lodash';

import { VersionConflict, RequestFailure } from 'ui/errors';
import RequestQueueProvider from 'ui/courier/_request_queue';
import FetchProvider from 'ui/courier/fetch/fetch';

export default function (Promise, Private, es, esAdmin, kbnIndex) {
  const requestQueue = Private(RequestQueueProvider);
  const courierFetch = Private(FetchProvider);

  /**
   * Backend for doUpdate and doIndex
   * @param  {String} method - the client method to call
   * @param  {Boolean} validateVersion - should our knowledge
   *                                   of the the docs current version be sent to es?
   * @param  {String} body - HTTP request body
   */
  return function (method, validateVersion, body, ignore) {
    const doc = this;
    // straight assignment will causes undefined values
    const params = _.pick(this._state, ['id', 'type', 'index']);
    params.body = body;
    params.ignore = ignore || [409];

    if (validateVersion && params.id) {
      params.version = doc._getVersion();
    }

    const client = [].concat(params.index).includes(kbnIndex) ? esAdmin : es;
    return client[method](params)
    .then(function (resp) {
      if (resp.status === 409) throw new VersionConflict(resp);

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
        const key = doc._versionKey();

        // clear the queue and filter out the removed items, pushing the
        // unmatched ones back in.
        const respondTo = requestQueue.splice(0).filter(function (req) {
          const isDoc = req.source._getType() === 'doc';
          const keyMatches = isDoc && req.source._versionKey() === key;

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
      throw new RequestFailure(err);
    });
  };
}
