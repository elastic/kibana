/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { OptionsListComponentState, OptionsListReduxState } from '../types';
import { ControlOutput, OptionsListEmbeddableInput } from '../..';
import { mockOptionsListReduxEmbeddableTools } from '../../../common/mocks';
import { OptionsListControl } from './options_list_control';
import { BehaviorSubject } from 'rxjs';

describe('Options list control', () => {
  const defaultProps = {
    typeaheadSubject: new BehaviorSubject(''),
  };

  interface MountOptions {
    componentState: Partial<OptionsListComponentState>;
    explicitInput: Partial<OptionsListEmbeddableInput>;
    output: Partial<ControlOutput>;
  }

  async function mountComponent(options?: Partial<MountOptions>) {
    const mockReduxEmbeddableTools = await mockOptionsListReduxEmbeddableTools({
      componentState: options?.componentState ?? {},
      explicitInput: options?.explicitInput ?? {},
      output: options?.output ?? {},
    } as Partial<OptionsListReduxState>);

    return mountWithIntl(
      <mockReduxEmbeddableTools.Wrapper>
        <OptionsListControl {...defaultProps} />
      </mockReduxEmbeddableTools.Wrapper>
    );
  }

  test('if exclude = false and existsSelected = true, then the option should read "Exists"', async () => {
    const control = await mountComponent({
      explicitInput: { id: 'testExists', exclude: false, existsSelected: true },
    });
    const existsOption = findTestSubject(control, 'optionsList-control-testExists');
    expect(existsOption.text()).toBe('Exists');
  });

  test('if exclude = true and existsSelected = true, then the option should read "Does not exist"', async () => {
    const control = await mountComponent({
      explicitInput: { id: 'testDoesNotExist', exclude: true, existsSelected: true },
    });
    const existsOption = findTestSubject(control, 'optionsList-control-testDoesNotExist');
    expect(existsOption.text()).toBe('DOES NOT Exist');
  });
});
