/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { CategoricalColorMapping } from './categorical_color_mapping';
import { AVAILABLE_PALETTES } from './palettes/available_palettes';
import { DEFAULT_COLOR_MAPPING_CONFIG } from './config/default_color_mapping';

describe('color mapping', () => {
  it('load a specified color mapping', () => {
    const component = mount(
      <CategoricalColorMapping
        data={{
          type: 'categories',
          categories: ['categoryA', 'categoryB'],
          specialTokens: new Map(),
        }}
        isDarkMode={true}
        model={DEFAULT_COLOR_MAPPING_CONFIG}
        palettes={AVAILABLE_PALETTES}
        onModelUpdate={(m) => console.log(m)}
      />
    );

    expect(
      component
        .find('EuiSwitch[data-test-subj="lns-colorMapping-autoAssignSwitch"]')
        .prop('checked')
    ).toEqual(true);

    expect(
      component
        .find('EuiSwitch[data-test-subj="lns-colorMapping-autoAssignSwitch"]')
        .prop('checked')
    ).toEqual(true);

    component.find('[data-test-subj="lns-colorMapping-assignmentsList"]').
  });
});
