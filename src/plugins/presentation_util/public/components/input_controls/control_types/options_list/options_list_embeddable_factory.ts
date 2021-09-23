/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactoryDefinition } from '../../../../../../embeddable/public';
import {
  OptionsListDataFetcher,
  OptionsListEmbeddable,
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
} from './options_list_embeddable';

export class OptionsListEmbeddableFactory implements EmbeddableFactoryDefinition {
  public type = OPTIONS_LIST_CONTROL;
  private fetchData: OptionsListDataFetcher;

  constructor(fetchData: OptionsListDataFetcher) {
    this.fetchData = fetchData;
  }

  public create(initialInput: OptionsListEmbeddableInput) {
    return Promise.resolve(new OptionsListEmbeddable(initialInput, {}, this.fetchData));
  }

  public isEditable = () => Promise.resolve(false);

  public getDisplayName = () => 'Options List Control';
}
