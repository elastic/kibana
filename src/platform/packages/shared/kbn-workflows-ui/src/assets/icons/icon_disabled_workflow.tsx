/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiIcon, type EuiIconProps } from '@elastic/eui';
import React from 'react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import IconSVG from './disabled_workflow.svg';
import IconDarkSVG from './disabled_workflow_dark.svg';

export const IconDisabledWorkflow = React.memo<Omit<EuiIconProps, 'type'>>((props) => {
  const isDark = useKibanaIsDarkMode();
  if (isDark) {
    return <EuiIcon type={IconDarkSVG} {...props} />;
  }
  return <EuiIcon type={IconSVG} {...props} />;
});
IconDisabledWorkflow.displayName = 'IconDisabledWorkflow';
