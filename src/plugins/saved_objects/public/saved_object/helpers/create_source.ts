/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SavedObjectAttributes } from '@kbn/core/public';
import { SavedObject, SavedObjectKibanaServices } from '../../types';
import { OVERWRITE_REJECTED } from '../../constants';
import { confirmModalPromise } from './confirm_modal_promise';

/**
 * Attempts to create the current object using the serialized source. If an object already
 * exists, a warning message requests an overwrite confirmation.
 * @param source - serialized version of this object (return value from this._serialize())
 * What will be indexed into elasticsearch.
 * @param savedObject - savedObject
 * @param esType - type of the saved object
 * @param options - options to pass to the saved object create method
 * @param services - provides Kibana services savedObjectsClient and overlays
 * @returns {Promise} - A promise that is resolved with the objects id if the object is
 * successfully indexed. If the overwrite confirmation was rejected, an error is thrown with
 * a confirmRejected = true parameter so that case can be handled differently than
 * a create or index error.
 * @resolved {SavedObject}
 */
export async function createSource(
  source: SavedObjectAttributes,
  savedObject: SavedObject,
  esType: string,
  options = {},
  services: SavedObjectKibanaServices
) {
  const { savedObjectsClient, overlays } = services;
  try {
    return await savedObjectsClient.create(esType, source, options);
  } catch (err) {
    // record exists, confirm overwriting
    if (get(err, 'res.status') === 409) {
      const confirmMessage = i18n.translate(
        'savedObjects.confirmModal.overwriteConfirmationMessage',
        {
          defaultMessage: 'Are you sure you want to overwrite {title}?',
          values: { title: savedObject.title },
        }
      );

      const title = i18n.translate('savedObjects.confirmModal.overwriteTitle', {
        defaultMessage: 'Overwrite {name}?',
        values: { name: savedObject.getDisplayName() },
      });
      const confirmButtonText = i18n.translate('savedObjects.confirmModal.overwriteButtonLabel', {
        defaultMessage: 'Overwrite',
      });

      return confirmModalPromise(confirmMessage, title, confirmButtonText, overlays)
        .then(() =>
          savedObjectsClient.create(
            esType,
            source,
            savedObject.creationOpts({ overwrite: true, ...options })
          )
        )
        .catch(() => Promise.reject(new Error(OVERWRITE_REJECTED)));
    }
    return await Promise.reject(err);
  }
}
