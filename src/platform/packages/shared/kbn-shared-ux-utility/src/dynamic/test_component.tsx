/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';

export interface TestComponentProps {
  customProp?: boolean;
  children?: React.ReactNode;
}

export const TestComponent: FC<PropsWithChildren<TestComponentProps>> = ({ children }) => {
  return <span>{children} Test component</span>;
};

export const ForwardeRefTestComponent: FC<PropsWithChildren<TestComponentProps>> = React.forwardRef<
  HTMLSpanElement,
  PropsWithChildren<TestComponentProps>
>(({ children }, ref) => {
  return <span ref={ref}>{children} Test component</span>;
});

// eslint-disable-next-line import/no-default-export
export default TestComponent;
