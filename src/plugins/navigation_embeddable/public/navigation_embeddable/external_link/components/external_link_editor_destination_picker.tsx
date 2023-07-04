/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useAsync from 'react-use/lib/useAsync';
import React, { useEffect, useState } from 'react';

import {
  EuiBadge,
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiHighlight,
  EuiSelectable,
  EuiFieldSearch,
  EuiSelectableOption,
  EuiFieldText,
} from '@elastic/eui';

import { LinkEditorDestinationProps } from '../../types';
import { NavEmbeddableStrings } from '../../navigation_container/components/navigation_embeddable_strings';

// TODO: As part of https://github.com/elastic/kibana/issues/154381, replace this regex URL check with more robust url validation
const isValidUrl =
  /^https?:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

export const ExternalLinkEditorDestinationPicker = ({
  initialInput,
  onChange,
  setPlaceholder,
  currentDashboardId,
  ...other
}: LinkEditorDestinationProps<DashboardLinkInput>) => {
  console.log('HERE!!');
  const [validUrl, setValidUrl] = useState<boolean>(true);
  // const [selectedUrl, setSelectedUrl] = useState<string>();

  // {...other} is needed so all inner elements are treated as part of the form
  return (
    <EuiFieldText
      {...other}
      placeholder={NavEmbeddableStrings.editor.external.getPlaceholder()}
      isInvalid={!validUrl}
      onChange={(e) => {
        const url = e.target.value;
        const isValid = isValidUrl.test(url);
        setValidUrl(isValid);

        if (isValid) {
          // setSelectedUrl(url);
          onChange({ ...initialInput, url });
        }
      }}
    />
  );
};
