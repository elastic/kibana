/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { SavedObjectsCreateOptions } from '@kbn/core/public';
import { OVERWRITE_REJECTED } from './constants';
import { confirmModalPromise } from './confirm_modal_promise';
import type { StartServices } from '../../types';
import { visualizationsClient } from '../../content_management';
import { VisualizationSavedObjectAttributes, VisualizationSavedObject } from '../../../common';
import { VisualizeOutputState } from '../../embeddable/types';

/**
 * Attempts to create the current object using the serialized source. If an object already
 * exists, a warning message requests an overwrite confirmation.
 * @param source - serialized version of this object what will be indexed into elasticsearch.
 * @param savedObject - VisSavedObject
 * @param options - options to pass to the saved object create method
 * @param services - provides Kibana services savedObjectsClient and overlays
 * @returns {Promise} - A promise that is resolved with the objects id if the object is
 * successfully indexed. If the overwrite confirmation was rejected, an error is thrown with
 * a confirmRejected = true parameter so that case can be handled differently than
 * a create or index error.
 * @resolved {SimpleSavedObject}
 */
export async function saveWithConfirmation(
  source: VisualizationSavedObjectAttributes,
  savedObject: Pick<VisualizeOutputState, 'title' | 'displayName'>,
  options: SavedObjectsCreateOptions,
  services: StartServices
): Promise<{ item: VisualizationSavedObject }> {
  try {
    return await visualizationsClient.create({ data: source, options });
  } catch (err) {
    // record exists, confirm overwriting
    if (get(err, 'res.status') === 409) {
      const confirmMessage = i18n.translate(
        'visualizations.confirmModal.overwriteConfirmationMessage',
        {
          defaultMessage: 'Are you sure you want to overwrite {title}?',
          values: { title: savedObject.title },
        }
      );

      const title = i18n.translate('visualizations.confirmModal.overwriteTitle', {
        defaultMessage: 'Overwrite {name}?',
        values: { name: savedObject.displayName },
      });
      const confirmButtonText = i18n.translate('visualizations.confirmModal.overwriteButtonLabel', {
        defaultMessage: 'Overwrite',
      });

      return confirmModalPromise(confirmMessage, title, confirmButtonText, services)
        .then(() =>
          visualizationsClient.create({
            data: source,
            options: {
              overwrite: true,
              ...options,
            },
          })
        )
        .catch(() => Promise.reject(new Error(OVERWRITE_REJECTED)));
    }
    return await Promise.reject(err);
  }
}
