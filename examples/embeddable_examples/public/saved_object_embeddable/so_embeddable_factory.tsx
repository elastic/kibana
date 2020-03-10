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
import { OverlayStart, CoreStart } from 'kibana/public';
import { EuiFieldText } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import {
  IContainer,
  EmbeddableFactory,
  EmbeddableOutput,
} from '../../../../src/plugins/embeddable/public';
import { SOEmbeddable, SO_EMBEDDABLE, SOEmbeddableInput } from './so_embeddable';

function SOExplicitInput({ onSave }: { onSave: (props: { id: string; type: string }) => void }) {
  const [id, setId] = useState('');
  const [type, setType] = useState('');

  return (
    <EuiModalBody>
      <EuiFieldText
        data-test-subj="idInputField"
        value={id}
        placeholder="Enter id here"
        onChange={e => setId(e.target.value)}
      />
      <EuiFieldText
        data-test-subj="typeInputField"
        value={type}
        placeholder="Enter type here"
        onChange={e => setType(e.target.value)}
      />
      <EuiButton data-test-subj="createSOEmbeddable" onClick={() => onSave({ id, type })}>
        Save
      </EuiButton>
    </EuiModalBody>
  );
}

interface StartServices {
  savedObjectClient: CoreStart['savedObjects']['client'];
  openModal: OverlayStart['openModal'];
}

export class SOEmbeddableFactory extends EmbeddableFactory<
  SOEmbeddableInput,
  EmbeddableOutput,
  SOEmbeddable
> {
  public readonly type = SO_EMBEDDABLE;

  constructor(private getServices: () => Promise<StartServices>) {
    super();
  }

  public async isEditable() {
    return true;
  }

  /**
   * This function is used when dynamically creating a new embeddable to add to a
   * container. Some input may be inherited from the container, but not all. This can be
   * used to collect specific embeddable input that the container will not provide, like
   * in this case, the task string.
   */
  public async getExplicitInput() {
    return new Promise<{ id: string; type: string }>(async resolve => {
      const { openModal } = await this.getServices();
      const onSave = (input: { id: string; type: string }) => resolve(input);
      const overlay = openModal(
        toMountPoint(
          <SOExplicitInput
            onSave={(input: { id: string; type: string }) => {
              onSave(input);
              overlay.close();
            }}
          />
        )
      );
    });
  }

  public async create(initialInput: SOInput, parent?: IContainer) {
    const { savedObjectClient } = await this.getServices();

    return new SOEmbeddable({
      input: initialInput,
      parent,
      savedObjectClient,
    });
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.todo.displayName', {
      defaultMessage: 'Saved object item',
    });
  }
}
