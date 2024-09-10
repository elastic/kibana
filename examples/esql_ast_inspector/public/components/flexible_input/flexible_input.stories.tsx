/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { FlexibleInput, FlexibleInputProps } from './flexible_input';

export default {
  title: '<FlexibleInput>',
  parameters: {},
};

const Demo: React.FC<FlexibleInputProps> = (props) => {
  const [value, setValue] = React.useState(props.value);

  return (
    <FlexibleInput
      {...props}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}
    />
  );
};

export const Example = () => <Demo value="hello" multiline />;
