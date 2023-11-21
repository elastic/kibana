/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { urlDrilldownValidateUrl } from '@kbn/ui-actions-enhanced-plugin/public';
import { coreServices } from '../../services/kibana_services';
import { ExternalLinkStrings } from './external_link_strings';

/**
 *
 * @param url The URl to validate
 * @returns Whether or not the URL is valid; if it is not, it will also return the reason it is invalid via the `message`
 */
export const validateUrl = (url: string): { valid: boolean; message?: string } => {
  try {
    /** This check will throw an error on invalid format, so catch it below */
    const allowedUrl = coreServices.http.externalUrl.validateUrl(url);

    if (allowedUrl === null) {
      return { valid: false, message: ExternalLinkStrings.getDisallowedUrlError() };
    }
    const validatedUrl = urlDrilldownValidateUrl(url);
    if (!validatedUrl.isValid) {
      throw new Error(); // will be caught below
    }
  } catch {
    return { valid: false, message: ExternalLinkStrings.getUrlFormatError() };
  }

  return { valid: true };
};
