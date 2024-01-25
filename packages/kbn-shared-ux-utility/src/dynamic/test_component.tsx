/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

export interface TestComponentProps {
  customProp?: boolean;
}

export const TestComponent = (props: TestComponentProps) => {
  return <span>Test component</span>;
};

export const ForwardeRefTestComponent = React.forwardRef<HTMLSpanElement, TestComponentProps>(
  (_props, ref) => {
    return <span ref={ref}>Test component</span>;
  }
);

// eslint-disable-next-line import/no-default-export
export default TestComponent;
