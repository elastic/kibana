/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { SkipBottomButton, SkipBottomButtonProps } from './skip_bottom_button';

describe('Skip to Bottom Button', function () {
  let props: SkipBottomButtonProps;
  let component: ReactWrapper<SkipBottomButtonProps>;

  beforeAll(() => {
    props = {
      onClick: jest.fn(),
    };
  });

  it('should be clickable', function () {
    component = mountWithIntl(<SkipBottomButton {...props} />);
    component.find('[data-test-subj="discoverSkipTableButton"]').last().simulate('click');
    expect(props.onClick).toHaveBeenCalled();
  });
});
