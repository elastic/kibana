/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { ScriptingHelpFlyout } from './help_flyout';

import { DataView } from '@kbn/data-views-plugin/public';

import { ExecuteScript } from '../../types';

jest.mock('./test_script', () => ({
  TestScript: () => {
    return `<div>mockTestScript</div>`;
  },
}));

const indexPatternMock = {} as DataView;

describe('ScriptingHelpFlyout', () => {
  it('should render normally', async () => {
    const component = shallow(
      <ScriptingHelpFlyout
        isVisible={true}
        indexPattern={indexPatternMock}
        lang="painless"
        executeScript={(() => {}) as unknown as ExecuteScript}
        onClose={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render nothing if not visible', async () => {
    const component = shallow(
      <ScriptingHelpFlyout
        isVisible={true}
        indexPattern={indexPatternMock}
        lang="painless"
        executeScript={(() => {}) as unknown as ExecuteScript}
        onClose={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
