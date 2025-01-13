/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps } from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { AlertsFlyout } from './alerts_flyout';
import { AlertsField, FlyoutSectionRenderer } from '../types';
import { createPartialObjectMock } from '../utils/test';

type FlyoutProps = ComponentProps<FlyoutSectionRenderer>;

const onClose = jest.fn();
const onPaginate = jest.fn();
const props = createPartialObjectMock<FlyoutProps>({
  alert: {
    _id: '0123456789',
    _index: '.alerts-default',
    [AlertsField.name]: ['one'],
    [AlertsField.reason]: ['two'],
  },
  tableId: 'test',
  columns: [
    {
      id: AlertsField.name,
      displayAsText: 'Name',
      initialWidth: 150,
    },
    {
      id: AlertsField.reason,
      displayAsText: 'Reason',
      initialWidth: 250,
    },
  ],
  renderCellValue: jest.fn((rcvProps) => {
    return (
      <>
        `${rcvProps.colIndex}:${rcvProps.rowIndex}`
      </>
    );
  }),
  renderFlyoutBody: () => <h3 data-test-subj="test-flyout-body">Internal flyout body</h3>,
  flyoutIndex: 0,
  alertsCount: 4,
  isLoading: false,
  onClose,
  onPaginate,
});

describe('AlertsFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render high level details from the alert', async () => {
    const wrapper = mountWithIntl(<AlertsFlyout {...props} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="test-flyout-body"]').first().text()).toBe(
      'Internal flyout body'
    );
  });

  it(`should use header from the alerts table props`, async () => {
    const customProps: FlyoutProps = {
      ...props,
      renderFlyoutHeader: () => <h4>Header</h4>,
    };
    const wrapper = mountWithIntl(<AlertsFlyout {...customProps} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('h4').first().text()).toBe('Header');
  });

  it(`should use body the alerts table props`, async () => {
    const customProps: FlyoutProps = {
      ...props,
      renderFlyoutBody: () => <h5>Body</h5>,
    };
    const wrapper = mountWithIntl(<AlertsFlyout {...customProps} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('h5').first().text()).toBe('Body');
  });

  it(`should use footer from the alerts table props`, async () => {
    const customProps: FlyoutProps = {
      ...props,
      renderFlyoutFooter: () => <h6>Footer</h6>,
    };
    const wrapper = mountWithIntl(<AlertsFlyout {...customProps} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('h6').first().text()).toBe('Footer');
  });

  it('should allow pagination with next', async () => {
    const wrapper = mountWithIntl(<AlertsFlyout {...props} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('[data-test-subj="pagination-button-next"]').last().simulate('click');
    expect(onPaginate).toHaveBeenCalledWith(1);
  });

  it('should allow pagination with previous', async () => {
    const customProps = {
      ...props,
      flyoutIndex: 1,
    };
    const wrapper = mountWithIntl(<AlertsFlyout {...customProps} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('[data-test-subj="pagination-button-previous"]').last().simulate('click');
    expect(onPaginate).toHaveBeenCalledWith(0);
  });
});
