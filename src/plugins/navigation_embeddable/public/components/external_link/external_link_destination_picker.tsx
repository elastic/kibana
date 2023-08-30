/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import useUnmount from 'react-use/lib/useUnmount';
import React, { useCallback, useState } from 'react';

import { EuiFieldText } from '@elastic/eui';
import { urlDrilldownValidateUrl } from '@kbn/ui-actions-enhanced-plugin/public';

import { ExternalLinkStrings } from './external_link_strings';
import { coreServices } from '../../services/kibana_services';

class DisallowedUrlError extends Error {}

export const ExternalLinkDestinationPicker = ({
  onDestinationPicked,
  setDestinationError,
  initialSelection,
  onUnmount,
  ...other
}: {
  initialSelection?: string;
  onUnmount: (destination: string) => void;
  onDestinationPicked: (destination?: string) => void;
  setDestinationError: (error: string | undefined) => void;
}) => {
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [currentUrl, setCurrentUrl] = useState<string>(initialSelection ?? '');

  const validateUrl = useCallback(
    (url: string) => {
      try {
        const allowedUrl = coreServices.http.externalUrl.validateUrl(url);
        if (allowedUrl === null) {
          throw new DisallowedUrlError();
        }
        const validatedUrl = urlDrilldownValidateUrl(url);
        if (validatedUrl.isValid) {
          setDestinationError(undefined);
          return true;
        } else {
          throw new Error();
        }
      } catch (error) {
        setDestinationError(
          error instanceof DisallowedUrlError
            ? ExternalLinkStrings.getDisallowedUrlError()
            : ExternalLinkStrings.getUrlFormatError()
        );
        return false;
      }
    },
    [setDestinationError]
  );

  useMount(() => {
    if (initialSelection) {
      const isValid = validateUrl(initialSelection);

      if (!isValid) {
        setValidUrl(false);
        onDestinationPicked(undefined); // prevent re-saving an invalid link
      } else {
        onDestinationPicked(initialSelection);
      }
    }
  });

  useUnmount(() => {
    /** Save the current selection so we can re-populate it if we switch back to this link editor */
    onUnmount(currentUrl);
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
            /* no need to validate the empty string - not an error, but also not a valid destination */
            setValidUrl(true);
            onDestinationPicked(undefined);
            setDestinationError(undefined);
            return;
          }

          const isValid = validateUrl(url);
          setValidUrl(isValid);
          if (isValid) {
            onDestinationPicked(url);
          } else {
            onDestinationPicked(undefined);
          }
        }}
      />
    </div>
  );
};
