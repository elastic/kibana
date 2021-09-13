/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// TODO: Add test using CodeEditor mock. Do a search for how the editor is mocked out elsewhere in the code.
// See https://github.com/elastic/kibana/pull/101392/files as example setup with extra benefit of 'copy-to-clickboard' action.
// also see src/plugins/discover/public/application/components/source_viewer/source_viewer.test.tsx as example for full mount with the editor
import { bulkGetObjectsMock } from './saved_object_view.test.mocks';

import React from 'react';
import { ShallowWrapper } from 'enzyme';
import { shallowWithI18nProvider } from '@kbn/test/jest';

import {
  httpServiceMock,
  overlayServiceMock,
  notificationServiceMock,
  savedObjectsServiceMock,
  applicationServiceMock,
  uiSettingsServiceMock,
  scopedHistoryMock,
  docLinksServiceMock,
} from '../../../../../core/public/mocks';

import {
  SavedObjectEdition,
  SavedObjectEditionProps,
  SavedObjectEditionState,
} from './saved_object_view';

describe('SavedObjectEdition', () => {
  let defaultProps: SavedObjectEditionProps;
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;
  let notifications: ReturnType<typeof notificationServiceMock.createStartContract>;
  let savedObjects: ReturnType<typeof savedObjectsServiceMock.createStartContract>;
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createStartContract>;
  let history: ReturnType<typeof scopedHistoryMock.create>;
  let applications: ReturnType<typeof applicationServiceMock.createStartContract>;
  let docLinks: ReturnType<typeof docLinksServiceMock.createStartContract>;

  const shallowRender = (overrides: Partial<SavedObjectEditionProps> = {}) => {
    return (shallowWithI18nProvider(
      <SavedObjectEdition {...defaultProps} {...overrides} />
    ) as unknown) as ShallowWrapper<
      SavedObjectEditionProps,
      SavedObjectEditionState,
      SavedObjectEdition
    >;
  };

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    overlays = overlayServiceMock.createStartContract();
    notifications = notificationServiceMock.createStartContract();
    savedObjects = savedObjectsServiceMock.createStartContract();
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
      savedObjectType: 'index-pattern',
      http,
      capabilities: applications.capabilities,
      overlays,
      notifications,
      savedObjectsClient: savedObjects.client,
      history,
      uiSettings,
      docLinks: docLinks.links,
    };

    bulkGetObjectsMock.mockImplementation(() => [{}]);
  });

  it('should render normally', async () => {
    bulkGetObjectsMock.mockImplementation(() =>
      Promise.resolve([
        {
          id: '1',
          type: 'index-pattern',
          attributes: {
            title: `MyIndexPattern*`,
          },
          meta: {
            title: `MyIndexPattern*`,
            icon: 'indexPatternApp',
            editUrl: '#/management/kibana/indexPatterns/patterns/1',
            inAppUrl: {
              path: '/management/kibana/indexPatterns/patterns/1',
              uiCapabilitiesPath: 'management.kibana.indexPatterns',
            },
          },
        },
      ])
    );
    const component = shallowRender();
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  it('should add danger toast when bulk get fails', async () => {
    bulkGetObjectsMock.mockImplementation(() =>
      Promise.resolve([
        {
          error: {
            message: 'Not found',
          },
        },
      ])
    );
    const component = shallowRender({ notFoundType: 'does_not_exist' });
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(notifications.toasts.addDanger).toHaveBeenCalled();
  });

  it('should add danger toast when bulk get throws', async () => {
    bulkGetObjectsMock.mockImplementation(() => Promise.reject(new Error('fail')));
    const component = shallowRender({ notFoundType: 'does_not_exist' });
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();

    expect(notifications.toasts.addDanger).toHaveBeenCalled();
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
        editUrl: '#/management/kibana/indexPatterns/patterns/1',
        inAppUrl: {
          path: '/management/kibana/indexPatterns/patterns/1',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
        hiddenType: false,
      },
    };
    bulkGetObjectsMock.mockImplementation(() => Promise.resolve([savedObjectItem]));
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
    await new Promise((resolve) => process.nextTick(resolve));
    component.update();
    const headerComponent = component.find('Header');
    expect(headerComponent.prop('canViewInApp')).toBe(true);
    expect(headerComponent.prop('canDelete')).toBe(true);
    expect(headerComponent.prop('viewUrl')).toEqual('/management/kibana/indexPatterns/patterns/1');
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
    await new Promise((resolve) => process.nextTick(resolve));
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
        editUrl: '#/management/kibana/indexPatterns/patterns/1',
        inAppUrl: {
          path: '/management/kibana/indexPatterns/patterns/1',
          uiCapabilitiesPath: 'management.kibana.indexPatterns',
        },
        hiddenType: false,
      },
    };

    it('should display a confirmation message on deleting the saved object', async () => {
      bulkGetObjectsMock.mockImplementation(() => Promise.resolve([savedObjectItem]));
      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        delete: jest.fn().mockImplementation(() => ({})),
      };
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
      overlays.openConfirm.mockResolvedValue(false);
      const component = shallowRender({
        capabilities: applications.capabilities,
        savedObjectsClient: mockSavedObjectsClient,
        overlays,
      });
      await new Promise((resolve) => process.nextTick(resolve));
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
      bulkGetObjectsMock.mockImplementation(() => Promise.resolve([savedObjectItem]));
      const mockSavedObjectsClient = {
        ...defaultProps.savedObjectsClient,
        delete: jest.fn().mockImplementation(() => ({})),
      };
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
      overlays.openConfirm.mockResolvedValue(true);
      const component = shallowRender({
        capabilities: applications.capabilities,
        savedObjectsClient: mockSavedObjectsClient,
        overlays,
      });
      await new Promise((resolve) => process.nextTick(resolve));
      component.update();
      component.instance().delete();
      expect(overlays.openConfirm).toHaveBeenCalledTimes(1);
      expect(history.location.pathname).toEqual('/');
    });

    it('should not enable delete if the saved object is hidden', async () => {
      bulkGetObjectsMock.mockImplementation(() =>
        Promise.resolve([{ ...savedObjectItem, meta: { hiddenType: true } }])
      );
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
      await new Promise((resolve) => process.nextTick(resolve));
      component.update();
      expect(component.find('Header').prop('canDelete')).toBe(false);
    });
  });
});
