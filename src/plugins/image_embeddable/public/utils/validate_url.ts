/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IExternalUrl } from '@kbn/core-http-browser';

const SAFE_URL_PATTERN = /^(?:(?:https?):|[^&:/?#]*(?:[/?#]|$))/gi;
const generalFormatError = i18n.translate(
  'imageEmbeddable.imageEditor.urlFormatGeneralErrorMessage',
  {
    defaultMessage: 'Invalid format. Example: {exampleUrl}',
    values: {
      exampleUrl: 'https://elastic.co/my-image.png',
    },
  }
);

const externalUrlError = i18n.translate(
  'imageEmbeddable.imageEditor.urlFormatExternalErrorMessage',
  {
    defaultMessage:
      'This URL is not allowed by your administrator. Refer to "externalUrl.policy" configuration.',
  }
);

export type ValidateUrlFn = ReturnType<typeof createValidateUrl>;

export function createValidateUrl(
  externalUrl: IExternalUrl
): (url: string) => { isValid: boolean; error?: string } {
  return (url: string) => {
    if (!url)
      return {
        isValid: false,
        error: generalFormatError,
      };

    try {
      new URL(url);
      if (!url.match(SAFE_URL_PATTERN)) throw new Error();

      const isExternalUrlValid = !!externalUrl.validateUrl(url);
      if (!isExternalUrlValid) {
        return {
          isValid: false,
          error: externalUrlError,
        };
      }

      return { isValid: true };
    } catch (e) {
      return {
        isValid: false,
        error: generalFormatError,
      };
    }
  };
}
