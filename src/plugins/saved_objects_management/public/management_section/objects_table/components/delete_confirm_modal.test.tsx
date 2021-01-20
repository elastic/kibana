/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
