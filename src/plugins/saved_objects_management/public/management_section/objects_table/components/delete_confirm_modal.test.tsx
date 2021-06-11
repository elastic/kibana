/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test/jest';
import { SavedObjectWithMetadata } from '../../../../common';
import { DeleteConfirmModal } from './delete_confirm_modal';

interface CreateObjectOptions {
  namespaces?: string[];
}

const createObject = ({ namespaces }: CreateObjectOptions = {}): SavedObjectWithMetadata => ({
  id: 'foo',
  type: 'bar',
  attributes: {},
  references: [],
  namespaces,
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

  describe('shared objects warning', () => {
    it('does not display a callout when no objects are shared', () => {
      const objs = [
        createObject(), // if for some reason an object has no namespaces array, it does not count as shared
        createObject({ namespaces: [] }), // if for some reason an object has an empty namespaces array, it does not count as shared
        createObject({ namespaces: ['one-space'] }), // an object in a single space does not count as shared
      ];
      const wrapper = mountWithIntl(
        <DeleteConfirmModal
          isDeleting={false}
          onConfirm={onConfirm}
          onCancel={onCancel}
          selectedObjects={objs}
        />
      );
      const callout = findTestSubject(wrapper, 'sharedObjectsWarning');
      expect(callout).toHaveLength(0);
    });

    it('displays a callout when one or more objects are shared', () => {
      const objs = [
        createObject({ namespaces: ['one-space'] }), // an object in a single space does not count as shared
        createObject({ namespaces: ['one-space', 'another-space'] }), // an object in two spaces counts as shared
        createObject({ namespaces: ['*'] }), // an object in all spaces counts as shared
      ];
      const wrapper = mountWithIntl(
        <DeleteConfirmModal
          isDeleting={false}
          onConfirm={onConfirm}
          onCancel={onCancel}
          selectedObjects={objs}
        />
      );
      const callout = findTestSubject(wrapper, 'sharedObjectsWarning');
      expect(callout).toHaveLength(1);
      expect(callout.text()).toMatchInlineSnapshot(
        `"2 shared objectsDeleting these objects will affect other spaces"`
      );
    });
  });
});
