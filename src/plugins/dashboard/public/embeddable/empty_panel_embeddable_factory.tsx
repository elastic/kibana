/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState } from 'react';
import { EuiModalBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { OverlayStart } from 'kibana/public';
import { IContainer, EmbeddableFactory } from '../embeddable_plugin';
import {
  EmptyPanelEmbeddable,
  EMPTY_PANEL_EMBEDDABLE,
  EmptyPanelEmbeddableInput,
  EmptyPanelEmbeddableOutput,
} from './empty_panel_embeddable';

function TaskInput({ onSave }: { onSave: (task: string) => void }) {
  const [task, setTask] = useState('');
  return <div>I am embeddable</div>;
}

interface StartServices {
  openModal: OverlayStart['openModal'];
}

export class EmptyPanelEmbeddableFactory extends EmbeddableFactory<
  EmptyPanelEmbeddableInput,
  EmptyPanelEmbeddableOutput,
  EmptyPanelEmbeddable
> {
  public readonly type = EMPTY_PANEL_EMBEDDABLE;

  constructor(private getStartServices: () => Promise<StartServices>) {
    super();
  }

  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmptyPanelEmbeddableInput, parent?: IContainer) {
    return new EmptyPanelEmbeddable(initialInput, parent);
  }

  /**
   * This function is used when dynamically creating a new embeddable to add to a
   * container. Some input may be inherited from the container, but not all. This can be
   * used to collect specific embeddable input that the container will not provide, like
   * in this case, the task string.
   */
  public async getExplicitInput() {
    const { openModal } = await this.getStartServices();
    return new Promise<{ task: string }>(resolve => {
      const onSave = (task: string) => resolve({ task });
    });
  }

  public getDisplayName() {
    return i18n.translate('dashboardContainer.emptyPanelEmbeddable.displayName', {
      defaultMessage: 'My Empty embeddable item',
    });
  }
}
