/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { IExternalUrl } from '@kbn/core-http-browser';
import { DATA_IMAGE_URL_PATTERN, MAX_IMAGE_URL_LENGTH } from '../../common';

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

const urlTooLongError = i18n.translate('imageEmbeddable.imageEditor.urlTooLongErrorMessage', {
  defaultMessage: 'The URL is too long. The maximum length is {maxLength} characters.',
  values: {
    maxLength: MAX_IMAGE_URL_LENGTH.toLocaleString(),
  },
});

const dataUrlError = i18n.translate('imageEmbeddable.imageEditor.dataUrlFormatErrorMessage', {
  defaultMessage:
    'Invalid image data. Only base64 encoded png, jpeg, gif and webp images up to {maxSize} are supported.',
  values: {
    maxSize: '512 KB',
  },
});

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

    if (url.length > MAX_IMAGE_URL_LENGTH) {
      return { isValid: false, error: urlTooLongError };
    }

    // data URLs have no host, so externalUrl policy does not apply; they are restricted by format and size instead
    if (url.startsWith('data:')) {
      return DATA_IMAGE_URL_PATTERN.test(url)
        ? { isValid: true }
        : { isValid: false, error: dataUrlError };
    }

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
