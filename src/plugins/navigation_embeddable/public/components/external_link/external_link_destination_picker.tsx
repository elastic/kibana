/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useEffect, useState } from 'react';

import { EuiFieldText } from '@elastic/eui';
import { ExternalLinkEmbeddableStrings } from './external_link_strings';

// TODO: As part of https://github.com/elastic/kibana/issues/154381, replace this regex URL check with more robust url validation
const isValidUrl =
  /^https?:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

export const ExternalLinkDestinationPicker = ({
  setDestination,
  setPlaceholder,
  initialSelection,
  ...other
}: {
  setDestination: (destination?: string) => void;
  setPlaceholder: (placeholder?: string) => void;
  initialSelection?: string;
}) => {
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [urlValue, setUrlValue] = useState(initialSelection);

  useMount(() => {
    if (urlValue && urlValue.length > 0) {
      setPlaceholder(urlValue);
      setValidUrl(isValidUrl.test(urlValue));
    }
  });

  useEffect(() => {
    if (urlValue) {
      const isValid = isValidUrl.test(urlValue);
      setValidUrl(isValid);
      setDestination(isValid ? urlValue : undefined);
      setPlaceholder(isValid ? urlValue : undefined);
    }
  }, [urlValue, setDestination, setPlaceholder]);

  /* {...other} is needed so all inner elements are treated as part of the form */
  return (
    <div {...other}>
      <EuiFieldText
        value={urlValue || ''}
        placeholder={ExternalLinkEmbeddableStrings.getPlaceholder()}
        isInvalid={!validUrl}
        onChange={(e) => setUrlValue(e.target.value)}
      />
    </div>
  );
};
