/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bulkDeleteObjectsMock, bulkGetObjectsMock } from './saved_object_view.test.mocks';

import React from 'react';
import { ShallowWrapper } from 'enzyme';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';

import {
  httpServiceMock,
  overlayServiceMock,
  notificationServiceMock,
  applicationServiceMock,
  uiSettingsServiceMock,
  scopedHistoryMock,
  docLinksServiceMock,
} from '@kbn/core/public/mocks';

import type { SavedObjectWithMetadata } from '../../types';
import {
  SavedObjectEdition,
  SavedObjectEditionProps,
  SavedObjectEditionState,
} from './saved_object_view';

const resolvePromises = () => new Promise((resolve) => process.nextTick(resolve));

describe('SavedObjectEdition', () => {
  let defaultProps: SavedObjectEditionProps;
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let notifications: ReturnType<typeof notificationServiceMock.createStartContract>;
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createStartContract>;
  let history: ReturnType<typeof scopedHistoryMock.create>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;
  let docLinks: ReturnType<typeof docLinksServiceMock.createStartContract>;

  const shallowRender = (overrides: Partial<SavedObjectEditionProps> = {}) => {
    return shallowWithI18nProvider(
      <SavedObjectEdition {...defaultProps} {...overrides} />
    ) as unknown as ShallowWrapper<
      SavedObjectEditionProps,
      SavedObjectEditionState,
      SavedObjectEdition
    >;
  };

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    overlays = overlayServiceMock.createStartContract();
    notifications = notificationServiceMock.createStartContract();
    uiSettings = uiSettingsServiceMock.createStartContract();
    history = scopedHistoryMock.create();
    docLinks = docLinksServiceMock.createStartContract();
    applications = applicationServiceMock.createStartContract();
    applications.capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      savedObjectsManagement: {
        read: true,
        edit: false,
        delete: false,
      },
    };

    http.post.mockResolvedValue([]);

    defaultProps = {
      id: '1',
      savedObjectType: 'dashboard',
      http,
      capabilities: applications.capabilities,
      overlays,
      notifications,
      history,
      uiSettings,
      docLinks: docLinks.links,
    };

    bulkDeleteObjectsMock.mockResolvedValue([{}]);
  });

  it('should render normally', async () => {
    bulkGetObjectsMock.mockResolvedValue([
      {
        id: '1',
        type: 'dashboard',
        attributes: {
          title: `MyDashboard*`,
        },
        meta: {
          title: `MyDashboard*`,
          icon: 'dashboardApp',
          inAppUrl: {
            path: '/app/dashboards#/view/1',
            uiCapabilitiesPath: 'management.kibana.dashboard',
          },
        },
      } as SavedObjectWithMetadata,
    ]);
    const component = shallowRender();
    // Ensure all promises resolve
    await resolvePromises();
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should add danger toast when bulk get fails', async () => {
    bulkGetObjectsMock.mockResolvedValue([
      {
        error: {
          error: '',
          message: 'Not found',
          statusCode: 404,
        },
      } as SavedObjectWithMetadata,
    ]);
    const component = shallowRender({ notFoundType: 'does_not_exist' });

    await resolvePromises();

    component.update();

    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
  });

  it('should add danger toast when bulk get throws', async () => {
    bulkGetObjectsMock.mockImplementation(() => Promise.reject(new Error('fail')));
    const component = shallowRender({ notFoundType: 'does_not_exist' });

    await resolvePromises();

    component.update();

    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
  });

  it('should pass the correct props to the child components', async () => {
    const savedObjectItem = {
      id: '1',
      type: 'index-pattern',
      attributes: {
        title: `MyIndexPattern*`,
      },
      meta: {
        title: `MyIndexPattern*`,
        icon: 'indexPatternApp',
        editUrl: '#/management/kibana/dataViews/dataView/1',
        inAppUrl: {
          path: '/management/kibana/dataViews/dataView/1',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
        hiddenType: false,
      },
    } as SavedObjectWithMetadata;
    bulkGetObjectsMock.mockResolvedValue([savedObjectItem]);
    applications.capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      savedObjectsManagement: {
        read: true,
        edit: false,
        delete: true,
      },
    };
    const component = shallowRender({
      capabilities: applications.capabilities,
    });

    await resolvePromises();

    component.update();
    const headerComponent = component.find('Header');
    expect(headerComponent.prop('canViewInApp')).toBe(true);
    expect(headerComponent.prop('canDelete')).toBe(true);
    expect(headerComponent.prop('viewUrl')).toEqual('/management/kibana/dataViews/dataView/1');
    const inspectComponent = component.find('Inspect');
    expect(inspectComponent.prop('object')).toEqual(savedObjectItem);
  });

  it("does not render Inspect if there isn't an object", async () => {
    bulkGetObjectsMock.mockImplementation(() => Promise.resolve([]));
    applications.capabilities = {
      navLinks: {},
      management: {},
      catalogue: {},
      savedObjectsManagement: {
        read: true,
        edit: false,
        delete: true,
      },
    };
    const component = shallowRender({
      capabilities: applications.capabilities,
    });

    await resolvePromises();

    component.update();
    const inspectComponent = component.find('Inspect');
    expect(inspectComponent).toEqual({});
  });

  describe('delete', () => {
    const savedObjectItem = {
      id: '1',
      type: 'index-pattern',
      attributes: {
        title: `MyIndexPattern*`,
      },
      meta: {
        title: `MyIndexPattern*`,
        icon: 'indexPatternApp',
        editUrl: '#/management/kibana/dataViews/dataView/1',
        inAppUrl: {
          path: '/management/kibana/dataViews/dataView/1',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
        hiddenType: false,
      },
    } as SavedObjectWithMetadata;

    beforeEach(() => {
      applications.capabilities = {
        navLinks: {},
        management: {},
        catalogue: {},
        savedObjectsManagement: {
          read: true,
          edit: false,
          delete: true,
        },
      };
    });

    it('should display a confirmation message on deleting the saved object', async () => {
      bulkGetObjectsMock.mockResolvedValue([savedObjectItem]);
      overlays.openConfirm.mockResolvedValue(false);

      const component = shallowRender();
      await resolvePromises();

      component.update();
      component.instance().delete();
      expect(overlays.openConfirm).toHaveBeenCalledWith(
        'This action permanently removes the object from Kibana.',
        {
          buttonColor: 'danger',
          confirmButtonText: 'Delete',
          title: `Delete '${savedObjectItem.meta.title}'?`,
        }
      );
    });

    it('should route back if action is confirm and user accepted', async () => {
      bulkGetObjectsMock.mockResolvedValue([savedObjectItem]);
      overlays.openConfirm.mockResolvedValue(true);

      const component = shallowRender();
      await resolvePromises();

      component.update();
      component.instance().delete();
      expect(overlays.openConfirm).toHaveBeenCalledTimes(1);
      expect(history.location.pathname).toEqual('/');
    });

    it('should not enable delete if the saved object is hidden', async () => {
      bulkGetObjectsMock.mockResolvedValue([{ ...savedObjectItem, meta: { hiddenType: true } }]);

      const component = shallowRender();
      await resolvePromises();

      component.update();
      expect(component.find('Header').prop('canDelete')).toBe(false);
    });

    it('should show a danger toast when bulk deletion fails', async () => {
      bulkGetObjectsMock.mockResolvedValue([savedObjectItem]);
      bulkDeleteObjectsMock.mockResolvedValue([
        {
          error: { message: 'Something went wrong.' },
          success: false,
        },
      ]);

      const component = shallowRender();
      await resolvePromises();

      component.update();
      await component.instance().delete();
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Something went wrong.',
        })
      );
    });
  });
});
