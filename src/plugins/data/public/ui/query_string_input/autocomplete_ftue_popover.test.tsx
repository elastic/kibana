/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { mountWithIntl as mount } from '@kbn/test/jest';
import { AutocompleteFtuePopover } from './autocomplete_ftue_popover';
import { EuiTourStep } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { coreMock } from '../../../../../core/public/mocks';
import { KibanaContextProvider } from '../../../../kibana_react/public';
import { IStorageWrapper } from '../../../../kibana_utils/public';
const startMock = coreMock.createStart();

describe('AutocompleteFtuePopover', () => {
  function wrapInContext(props: {
    isVisible?: boolean;
    storage: IStorageWrapper;
    children: ReactElement;
  }) {
    const services = { docLinks: startMock.docLinks };
    return (
      <KibanaContextProvider services={services}>
        <AutocompleteFtuePopover {...props} />
      </KibanaContextProvider>
    );
  }

  const createMockStorage = () => ({
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  });

  it('should hide popover if local storage flag is set', () => {
    const children = <span />;
    const storage = createMockStorage();
    storage.get.mockReturnValue(true);
    const instance = mount(wrapInContext({ storage, children }));
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(false);
  });

  it('should render popover if local storage flag is not set', () => {
    const children = <span />;
    const instance = mount(
      wrapInContext({
        storage: createMockStorage(),
        isVisible: true,
        children,
      })
    );
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(true);
  });

  it('should hide popover if it is closed', async () => {
    const props = {
      children: <span />,
      showAutocompleteFtuePopover: true,
      storage: createMockStorage(),
    };
    const instance = mount(wrapInContext(props));
    act(() => {
      instance.find(EuiTourStep).prop('closePopover')!();
    });
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(false);
  });

  it('should set local storage flag and hide on closing with button', () => {
    const props = {
      children: <span />,
      showAutocompleteFtuePopover: true,
      storage: createMockStorage(),
    };
    const instance = mount(wrapInContext(props));
    act(() => {
      instance.find(EuiTourStep).prop('footerAction')!.props.onClick();
    });
    expect(props.storage.set).toHaveBeenCalledWith(expect.any(String), true);
    expect(instance.find(EuiTourStep).prop('isStepOpen')).toBe(false);
  });
});
