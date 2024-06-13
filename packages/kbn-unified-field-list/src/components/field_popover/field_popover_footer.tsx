/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { EuiPopoverFooter } from '@elastic/eui';
import { type FieldVisualizeButtonProps, getFieldVisualizeButton } from '../field_visualize_button';
import { ErrorBoundary } from '../error_boundary';

export type FieldPopoverFooterProps = FieldVisualizeButtonProps;

const FieldPopoverFooterComponent: React.FC<FieldPopoverFooterProps> = (props) => {
  const [visualizeButton, setVisualizeButton] = useState<JSX.Element | null>(null);

  useEffect(() => {
    getFieldVisualizeButton(props)
      .then(setVisualizeButton)
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }, [props]);

  return visualizeButton ? <EuiPopoverFooter>{visualizeButton}</EuiPopoverFooter> : null;
};

export const FieldPopoverFooter: React.FC<FieldPopoverFooterProps> = (props) => {
  return (
    <ErrorBoundary>
      <FieldPopoverFooterComponent {...props} />
    </ErrorBoundary>
  );
};
