/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
// import { EuiPopoverFooter } from '@elastic/eui';
import { FieldCategorizeButton, type FieldCategorizeButtonProps } from './field_categorize_button';

export type FieldPopoverCategorizeProps = Omit<FieldCategorizeButtonProps, 'wrapInContainer'>;

// const wrapInContainer = (element: React.ReactElement): React.ReactElement => {
//   return <EuiPopoverFooter>{element}</EuiPopoverFooter>;
// };

export const FieldPopoverCategorize: React.FC<FieldPopoverCategorizeProps> = (props) => {
  return <FieldCategorizeButton {...props} />;
  // return <FieldVisualizeButton {...props} wrapInContainer={wrapInContainer} />;
};
