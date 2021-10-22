/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  ControlEditorProps,
  GetControlEditorComponentProps,
  IEditableControlFactory,
} from '../../types';
import { OptionsListEditor } from './options_list_editor';
import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from './types';
import { EmbeddableFactoryDefinition, IContainer } from '../../../../../../embeddable/public';
import {
  createOptionsListExtract,
  createOptionsListInject,
} from '../../../../../common/controls/control_types/options_list/options_list_persistable_state';

export class OptionsListEmbeddableFactory
  implements EmbeddableFactoryDefinition, IEditableControlFactory
{
  public type = OPTIONS_LIST_CONTROL;
  public canCreateNew = () => false;

  constructor() {}

  public async create(initialInput: OptionsListEmbeddableInput, parent?: IContainer) {
    const { OptionsListEmbeddable } = await import('./options_list_embeddable');
    return Promise.resolve(new OptionsListEmbeddable(initialInput, {}, parent));
  }

  public getControlEditor = ({
    onChange,
    initialInput,
  }: GetControlEditorComponentProps<OptionsListEmbeddableInput>) => {
    return ({ setValidState, setDefaultTitle }: ControlEditorProps) => (
      <OptionsListEditor
        setDefaultTitle={setDefaultTitle}
        setValidState={setValidState}
        initialInput={initialInput}
        onChange={onChange}
      />
    );
  };

  public isEditable = () => Promise.resolve(false);

  public getDisplayName = () => 'Options List Control';

  public inject = createOptionsListInject();
  public extract = createOptionsListExtract();
}
