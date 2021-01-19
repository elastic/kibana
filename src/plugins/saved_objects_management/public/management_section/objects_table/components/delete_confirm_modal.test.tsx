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

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { SavedObjectWithMetadata } from '../../../../common';
import { DeleteConfirmModal } from './delete_confirm_modal';

const createObject = (): SavedObjectWithMetadata => ({
  id: 'foo',
  type: 'bar',
  attributes: {},
  references: [],
  meta: {},
});

describe('DeleteConfirmModal', () => {
  let onConfirm: jest.Mock;
  let onCancel: jest.Mock;

  beforeEach(() => {
    onConfirm = jest.fn();
    onCancel = jest.fn();
  });

  it('displays a loader if `isDeleting` is true', () => {
    const wrapper = mountWithIntl(
      <DeleteConfirmModal
        isDeleting={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
        selectedObjects={[]}
      />
    );
    expect(wrapper.find('EuiLoadingElastic')).toHaveLength(1);
    expect(wrapper.find('EuiModal')).toHaveLength(0);
  });

  it('lists the objects to delete', () => {
    const objs = [createObject(), createObject(), createObject()];
    const wrapper = mountWithIntl(
      <DeleteConfirmModal
        isDeleting={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
        selectedObjects={objs}
      />
    );
    expect(wrapper.find('.euiTableRow')).toHaveLength(3);
  });

  it('calls `onCancel` when clicking on the cancel button', () => {
    const wrapper = mountWithIntl(
      <DeleteConfirmModal
        isDeleting={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
        selectedObjects={[]}
      />
    );
    wrapper.find('EuiButtonEmpty').simulate('click');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls `onDelete` when clicking on the delete button', () => {
    const wrapper = mountWithIntl(
      <DeleteConfirmModal
        isDeleting={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
        selectedObjects={[]}
      />
    );
    wrapper.find('EuiButton').simulate('click');

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
