/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { render } from '@testing-library/react';
import { OptionsListEmbeddableContext } from '../embeddable/options_list_embeddable';
import { OptionsListComponentState, OptionsListReduxState } from '../types';
import { mockOptionsListEmbeddable } from '../../../common/mocks';
import { OptionsListControl } from './options_list_control';
import { BehaviorSubject } from 'rxjs';
import { OptionsListEmbeddableInput } from '..';
import { ControlOutput } from '../../types';

describe('Options list control', () => {
  const defaultProps = {
    typeaheadSubject: new BehaviorSubject(''),
    loadMoreSubject: new BehaviorSubject(10),
  };

  interface MountOptions {
    componentState: Partial<OptionsListComponentState>;
    explicitInput: Partial<OptionsListEmbeddableInput>;
    output: Partial<ControlOutput>;
  }

  async function mountComponent(options?: Partial<MountOptions>) {
    const optionsListEmbeddable = await mockOptionsListEmbeddable({
      componentState: options?.componentState ?? {},
      explicitInput: options?.explicitInput ?? {},
      output: options?.output ?? {},
    } as Partial<OptionsListReduxState>);

    return render(
      <OptionsListEmbeddableContext.Provider value={optionsListEmbeddable}>
        <OptionsListControl {...defaultProps} />
      </OptionsListEmbeddableContext.Provider>
    );
  }

  test('if exclude = false and existsSelected = true, then the option should read "Exists"', async () => {
    const control = await mountComponent({
      explicitInput: { id: 'testExists', exclude: false, existsSelected: true },
    });
    const existsOption = control.getByTestId('optionsList-control-testExists');
    expect(existsOption).toHaveTextContent('Exists');
  });

  test('if exclude = true and existsSelected = true, then the option should read "Does not exist"', async () => {
    const control = await mountComponent({
      explicitInput: { id: 'testDoesNotExist', exclude: true, existsSelected: true },
    });
    const existsOption = control.getByTestId('optionsList-control-testDoesNotExist');
    expect(existsOption).toHaveTextContent('DOES NOT Exist');
  });
});
