/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useViewDetailsActionProps } from './view_details_popover';
import { getWarningsDescription, getWarningsTitle } from './i18n_utils';
import type { SearchResponseWarning } from '../../types';

const CALLOUT_DISMISSED_KEY = 'discover:warningCalloutDismissed';

interface Props {
  warnings: SearchResponseWarning[];
}

export const SearchResponseWarningsCallout = (props: Props) => {
  const viewDetailsActionProps = useViewDetailsActionProps(props.warnings);
  const [isDismissed, setIsDismissed] = useState(
    () => sessionStorage.getItem(CALLOUT_DISMISSED_KEY) === 'true'
  );

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    sessionStorage.setItem(CALLOUT_DISMISSED_KEY, 'true');
  }, []);

  if (!props.warnings.length || isDismissed) {
    return null;
  }

  return (
    <KbnWarningCallout
      title={getWarningsTitle(props.warnings)}
      text={getWarningsDescription(props.warnings)}
      size="s"
      actionProps={{ primary: viewDetailsActionProps }}
      data-test-subj="searchResponseWarningsCallout"
      onDismiss={handleDismiss}
    />
  );
};
