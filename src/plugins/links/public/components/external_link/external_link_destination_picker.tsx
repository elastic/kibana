/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useMount from 'react-use/lib/useMount';
import useUnmount from 'react-use/lib/useUnmount';
import React, { useState } from 'react';

import { EuiFieldText } from '@elastic/eui';

import { ExternalLinkStrings } from './external_link_strings';
import { validateUrl } from './external_link_tools';

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

  useMount(() => {
    if (initialSelection) {
      const { valid, message } = validateUrl(initialSelection);

      if (!valid) {
        setValidUrl(false);
        setDestinationError(message);
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

          const { valid, message } = validateUrl(url);
          setValidUrl(valid);
          if (valid) {
            onDestinationPicked(url);
            setDestinationError(undefined);
          } else {
            onDestinationPicked(undefined);
            setDestinationError(message);
          }
        }}
        data-test-subj="links--linkEditor--externalLink--input"
      />
    </div>
  );
};
