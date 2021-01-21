/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ShallowWrapper, ReactWrapper } from 'enzyme';

export const updateComponent = async (
  component:
    | ShallowWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>
    | ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>
) => {
  // Ensure all promises resolve
  await new Promise((resolve) => process.nextTick(resolve));
  // Ensure the state changes are reflected
  component.update();
};
