/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider, mountWithIntl } from '@kbn/test-jest-helpers';
import { OverwriteModalProps, OverwriteModal } from './overwrite_modal';
import { findTestSubject } from '@elastic/eui/lib/test';

describe('OverwriteModal', () => {
  const obj = { type: 'foo', id: 'bar', meta: { title: 'baz' } };
  const onFinish = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('with a regular conflict', () => {
    const props: OverwriteModalProps = {
      conflict: { obj, error: { type: 'conflict', destinationId: 'qux' } },
      onFinish,
    };

    it('should render as expected', async () => {
      const wrapper = shallowWithI18nProvider(<OverwriteModal {...props} />);

      expect(wrapper.find('p').text()).toMatchInlineSnapshot(
        `"\\"baz\\" conflicts with an existing object. Overwrite it?"`
      );
      expect(wrapper.find('EuiSuperSelect')).toHaveLength(0);
    });

    it('should call onFinish with expected args when Skip is clicked', async () => {
      const wrapper = mountWithIntl(<OverwriteModal {...props} />);

      expect(onFinish).not.toHaveBeenCalled();
      findTestSubject(wrapper, 'confirmModalCancelButton').simulate('click');
      expect(onFinish).toHaveBeenCalledWith(false);
    });

    it('should call onFinish with expected args when Overwrite is clicked', async () => {
      const wrapper = mountWithIntl(<OverwriteModal {...props} />);

      expect(onFinish).not.toHaveBeenCalled();
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      expect(onFinish).toHaveBeenCalledWith(true, 'qux');
    });
  });

  describe('with an ambiguous conflict', () => {
    const props: OverwriteModalProps = {
      conflict: {
        obj,
        error: {
          type: 'ambiguous_conflict',
          destinations: [
            // TODO: change one of these to have an actual `updatedAt` date string, and mock Moment for the snapshot below
            { id: 'qux', title: 'some title', updatedAt: undefined },
            { id: 'quux', title: 'another title', updatedAt: undefined },
          ],
        },
      },
      onFinish,
    };

    it('should render as expected', async () => {
      const wrapper = shallowWithI18nProvider(<OverwriteModal {...props} />);

      expect(wrapper.find('p').text()).toMatchInlineSnapshot(
        `"\\"baz\\" conflicts with multiple existing objects. Overwrite one?"`
      );
      expect(wrapper.find('EuiSuperSelect')).toHaveLength(1);
    });

    it('should call onFinish with expected args when Skip is clicked', async () => {
      const wrapper = mountWithIntl(<OverwriteModal {...props} />);

      expect(onFinish).not.toHaveBeenCalled();
      findTestSubject(wrapper, 'confirmModalCancelButton').simulate('click');
      expect(onFinish).toHaveBeenCalledWith(false);
    });

    it('should call onFinish with expected args when Overwrite is clicked', async () => {
      const wrapper = mountWithIntl(<OverwriteModal {...props} />);

      expect(onFinish).not.toHaveBeenCalled();
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      // first destination is selected by default
      expect(onFinish).toHaveBeenCalledWith(true, 'qux');
    });
  });
});
