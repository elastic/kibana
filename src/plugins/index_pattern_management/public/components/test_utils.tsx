/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { shallow } from 'enzyme';

// since the 'shallow' from 'enzyme' doesn't support context API for React 16 and above (https://github.com/facebook/react/pull/14329)
// we use this workaround where define legacy contextTypes for react class component
export function createComponentWithContext<Props = Record<string, any>>(
  MyComponent: React.ComponentClass<any>,
  props: Props,
  mockedContext: Record<string, any>
) {
  MyComponent.contextTypes = {
    services: PropTypes.object,
  };

  return shallow(<MyComponent {...props} />, {
    context: {
      services: mockedContext,
    },
  });
}
