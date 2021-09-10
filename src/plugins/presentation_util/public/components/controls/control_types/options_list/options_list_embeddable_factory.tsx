/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EmbeddableFactoryDefinition } from '../../../../../../embeddable/public';
import { toMountPoint } from '../../../../../../kibana_react/public';
import { PresentationOverlaysService } from '../../../../services/overlays';
import {
  OptionsListDataFetcher,
  OptionsListEmbeddable,
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
} from './options_list_embeddable';

export class OptionsListEmbeddableFactory implements EmbeddableFactoryDefinition {
  public type = OPTIONS_LIST_CONTROL;

  constructor(
    private fetchData: OptionsListDataFetcher,
    private openFlyout: PresentationOverlaysService['openFlyout']
  ) {
    this.fetchData = fetchData;
    this.openFlyout = openFlyout;
  }

  public create(initialInput: OptionsListEmbeddableInput) {
    return Promise.resolve(new OptionsListEmbeddable(initialInput, {}, this.fetchData));
  }

  public async getExplicitInput(): Promise<Omit<OptionsListEmbeddableInput, 'id'>> {
    return new Promise<Omit<OptionsListEmbeddableInput, 'id'>>((resolve) => {
      const overlay = this.openFlyout(toMountPoint(<div>MOUNTEd</div>));
      setTimeout(() => {
        overlay.close();
        resolve({ field: 'DestCountry', title: 'test me', indexPattern: 'none' });
      }, 1000);
    });
  }

  public isEditable = () => Promise.resolve(false);

  public getDisplayName = () => 'Options List Control';
}
