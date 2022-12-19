/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { shallow } from 'enzyme';

import { CmAvatarUi } from '../avatar_ui';

describe('CmAvatarUi', () => {
  it('should render EuiAvatar component under the hood', () => {
    const wrapper = shallow(<CmAvatarUi title="Test" />);

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiAvatar
        name="Test"
        type="space"
      />
    `);
  });
});
