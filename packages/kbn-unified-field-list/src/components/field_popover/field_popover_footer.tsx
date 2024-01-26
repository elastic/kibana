/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiPopoverFooter, EuiSpacer } from '@elastic/eui';
import { type FieldVisualizeButtonProps, getFieldVisualizeButton } from '../field_visualize_button';
import { FieldCategorizeButtonProps, getFieldCategorizeButton } from '../field_categorize_button';
import { ErrorBoundary } from '../error_boundary';

export type FieldPopoverFooterProps = FieldVisualizeButtonProps | FieldCategorizeButtonProps;

const FieldPopoverFooterComponent: React.FC<FieldPopoverFooterProps> = (props) => {
  const [visualizeButton, setVisualizeButton] = useState<JSX.Element | null>(null);
  const [categorizeButton, setCategorizeButton] = useState<JSX.Element | null>(null);

  useEffect(() => {
    getFieldVisualizeButton(props)
      .then(setVisualizeButton)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
    getFieldCategorizeButton(props)
      .then(setCategorizeButton)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }, [props]);

  return visualizeButton || categorizeButton ? (
    <EuiPopoverFooter>
      {visualizeButton}
      {visualizeButton && categorizeButton ? <EuiSpacer size="s" /> : null}
      {categorizeButton}
    </EuiPopoverFooter>
  ) : null;
};

export const FieldPopoverFooter: React.FC<FieldPopoverFooterProps> = (props) => {
  return (
    <ErrorBoundary>
      <FieldPopoverFooterComponent {...props} />
    </ErrorBoundary>
  );
};
