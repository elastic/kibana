/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import useMount from 'react-use/lib/useMount';

import { EuiFieldText } from '@elastic/eui';
import { urlDrilldownValidateUrl } from '@kbn/ui-actions-enhanced-plugin/public';

import { ExternalLinkStrings } from './external_link_strings';
import { coreServices } from '../../services/kibana_services';

class DisallowedUrlError extends Error {}

export const ExternalLinkDestinationPicker = ({
  onDestinationPicked,
  setDestinationError,
  initialSelection,
  ...other
}: {
  onDestinationPicked: (destination?: string) => void;
  setDestinationError: (error: string | undefined) => void;
  initialSelection?: string;
}) => {
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [currentUrl, setCurrentUrl] = useState<string>(initialSelection ?? '');

  useMount(() => {
    if (initialSelection) {
      const url = coreServices.http.externalUrl.validateUrl(initialSelection);
      if (url === null) {
        setValidUrl(false);
        onDestinationPicked(undefined);
        setDestinationError(ExternalLinkStrings.getDisallowedUrlError());
      } else {
        onDestinationPicked(initialSelection);
      }
    }
  });

  /* {...other} is needed so all inner elements are treated as part of the form */
  return (
    <div {...other}>
      <EuiFieldText
        value={currentUrl}
        placeholder={ExternalLinkStrings.getPlaceholder()}
        isInvalid={!validUrl}
        onChange={(event) => {
          const url = event.target.value;
          setCurrentUrl(url);

          if (url === '') {
            setValidUrl(true);
            onDestinationPicked(undefined);
            setDestinationError(undefined);
            return;
          }

          try {
            const allowedUrl = coreServices.http.externalUrl.validateUrl(url); // TODO: rename this
            if (allowedUrl === null) {
              throw new DisallowedUrlError();
            }
            const validatedUrl = urlDrilldownValidateUrl(url);
            if (validatedUrl.isValid) {
              setValidUrl(true);
              onDestinationPicked(url);
              setDestinationError(undefined);
            } else {
              throw new Error();
            }
          } catch (error) {
            setValidUrl(false);
            onDestinationPicked(undefined);
            setDestinationError(
              error instanceof DisallowedUrlError
                ? ExternalLinkStrings.getDisallowedUrlError()
                : ExternalLinkStrings.getUrlFormatError()
            );
          }
        }}
      />
    </div>
  );
};
