/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useState } from 'react';

import { EuiFieldText } from '@elastic/eui';
import { ExternalLinkStrings } from './external_link_strings';
import { coreServices } from '../../services/kibana_services';

export const ExternalLinkDestinationPicker = ({
  onDestinationPicked,
  initialSelection,
  ...other
}: {
  onDestinationPicked: (destination?: string) => void;
  initialSelection?: string;
}) => {
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [currentUrl, setCurrentUrl] = useState<string>(initialSelection ?? '');

  useMount(() => {
    if (initialSelection) {
      const url = coreServices.http.externalUrl.validateUrl(initialSelection);
      if (url === null) {
        setValidUrl(false);
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
        onChange={(e) => {
          setCurrentUrl(e.target.value);
          try {
            const url = coreServices.http.externalUrl.validateUrl(e.target.value);
            if (url === null) {
              /* This error doesn't need to be translated because it will never be exposed to
               * the user - it will always be caught and handled in the `catch` below */
              throw new Error('Invalid URL');
            } else {
              setValidUrl(true);
              onDestinationPicked(e.target.value);
            }
          } catch {
            setValidUrl(false);
            onDestinationPicked(undefined);
          }
        }}
      />
    </div>
  );
};
