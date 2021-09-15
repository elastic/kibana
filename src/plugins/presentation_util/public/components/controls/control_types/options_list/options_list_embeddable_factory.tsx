/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EmbeddableFactoryDefinition } from '../../../../../../embeddable/public';
import { PresentationOverlaysService } from '../../../../services/overlays';
import {
  ControlEditorProps,
  GetControlEditorComponentProps,
  IEditableControlFactory,
} from '../../types';
import { OptionsListEditor } from './options_list_editor';
import {
  OptionsListDataFetcher,
  OptionsListEmbeddable,
  OptionsListEmbeddableInput,
  OptionsListFieldFetcher,
  OptionsListIndexPatternFetcher,
  OPTIONS_LIST_CONTROL,
} from './options_list_embeddable';

export class OptionsListEmbeddableFactory
  implements EmbeddableFactoryDefinition, IEditableControlFactory {
  public type = OPTIONS_LIST_CONTROL;

  constructor(
    private fetchData: OptionsListDataFetcher,
    private fetchIndexPatterns: OptionsListIndexPatternFetcher,
    private fetchFields: OptionsListFieldFetcher,
    private openFlyout: PresentationOverlaysService['openFlyout']
  ) {
    this.fetchIndexPatterns = fetchIndexPatterns;
    this.fetchFields = fetchFields;
    this.openFlyout = openFlyout;
    this.fetchData = fetchData;
  }

  public create(initialInput: OptionsListEmbeddableInput) {
    return Promise.resolve(new OptionsListEmbeddable(initialInput, {}, this.fetchData));
  }

  public getControlEditor = ({
    onChange,
    initialInput,
  }: GetControlEditorComponentProps<OptionsListEmbeddableInput>) => {
    return ({ setValidState }: ControlEditorProps) => (
      <OptionsListEditor
        fetchIndexPatterns={this.fetchIndexPatterns}
        fetchFields={this.fetchFields}
        setValidState={setValidState}
        initialInput={initialInput}
        onChange={onChange}
      />
    );
  };

  public isEditable = () => Promise.resolve(false);

  public getDisplayName = () => 'Options List Control';
}
