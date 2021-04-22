/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import React from 'react';
// import { getSavedDashboardMock } from '../test_helpers';
// import { InputTimeRange, TimefilterContract, TimeRange } from '../../services/data';
// import { DashboardContainer } from '..';
// import { DashboardContainerInput } from '../..';
// import { ViewMode } from '../../services/embeddable';
// import { DashboardContainerServices } from '../embeddable/dashboard_container';
// import { embeddablePluginMock } from '../../../../embeddable/public/mocks';
// import { DashboardAppServices, DashboardCapabilities } from '../../types';
// import { dataPluginMock } from '../../../../data/public/mocks';
// import { renderHook, act } from '@testing-library/react-hooks';
// import { KibanaContextProvider } from '../../../../kibana_react/public';

// import { createKbnUrlStateStorage, defer } from '../../../../kibana_utils/public';
// import { createBrowserHistory } from 'history';

// import { EmbeddableFactory } from '../../../../embeddable/public';
// import { HelloWorldEmbeddable } from '../../../../embeddable/public/tests/fixtures';
// import { coreMock } from '../../../../../core/public/mocks';

describe('DashboardAppState', function () {
  test('STUB - TODO', () => {});
});

//   let mockTime: TimeRange = { to: 'now', from: 'now-15m' };
//   const mockTimefilter = {
//     getTime: () => {
//       return mockTime;
//     },
//     setTime: (time: InputTimeRange) => {
//       mockTime = time as TimeRange;
//     },
//   } as TimefilterContract;

//   // TS is *very* picky with type guards / predicates. can't just use jest.fn()
//   function mockHasTaggingCapabilities(obj: any): obj is any {
//     return false;
//   }

//   const setupEmbeddableFactory = (services: DashboardAppServices) => {
//     const embeddable = new HelloWorldEmbeddable({ id: 'id' });
//     const deferEmbeddableCreate = defer();
//     services.embeddable.getEmbeddableFactory = jest.fn().mockImplementation(
//       () =>
//         (({
//           create: () => deferEmbeddableCreate.promise,
//         } as unknown) as EmbeddableFactory)
//     );
//     const destroySpy = jest.spyOn(embeddable, 'destroy');

//     return {
//       destroySpy,
//       embeddable,
//       createEmbeddable: () => {
//         act(() => {
//           deferEmbeddableCreate.resolve(embeddable);
//         });
//       },
//     };
//   };

//   function initDashboardContainer(initialInput?: Partial<DashboardContainerInput>) {
//     const { doStart } = embeddablePluginMock.createInstance();
//     const defaultInput: DashboardContainerInput = {
//       id: '123',
//       viewMode: ViewMode.EDIT,
//       filters: [] as DashboardContainerInput['filters'],
//       query: {} as DashboardContainerInput['query'],
//       timeRange: {} as DashboardContainerInput['timeRange'],
//       useMargins: true,
//       syncColors: false,
//       title: 'ultra awesome test dashboard',
//       isFullScreenMode: false,
//       panels: {} as DashboardContainerInput['panels'],
//     };
//     const input = { ...defaultInput, ...(initialInput ?? {}) };
//     return new DashboardContainer(input, { embeddable: doStart() } as DashboardContainerServices);

// describe('syncTimefilterWithDashboard', function () {
//     test('syncs quick time', function () {
//       savedDashboard.timeRestore = true;
//       savedDashboard.timeFrom = 'now/w';
//       savedDashboard.timeTo = 'now/w';

//       mockTime.from = '2015-09-19 06:31:44.000';
//       mockTime.to = '2015-09-29 06:31:44.000';

//       initDashboardState();
//       dashboardState.syncTimefilterWithDashboardTime(mockTimefilter);

//       expect(mockTime.to).toBe('now/w');
//       expect(mockTime.from).toBe('now/w');
//     });

//     test('syncs relative time', function () {
//       savedDashboard.timeRestore = true;
//       savedDashboard.timeFrom = 'now-13d';
//       savedDashboard.timeTo = 'now';

//       mockTime.from = '2015-09-19 06:31:44.000';
//       mockTime.to = '2015-09-29 06:31:44.000';

//       initDashboardState();
//       dashboardState.syncTimefilterWithDashboardTime(mockTimefilter);

//       expect(mockTime.to).toBe('now');
//       expect(mockTime.from).toBe('now-13d');
//     });

//     test('syncs absolute time', function () {
//       savedDashboard.timeRestore = true;
//       savedDashboard.timeFrom = '2015-09-19 06:31:44.000';
//       savedDashboard.timeTo = '2015-09-29 06:31:44.000';

//       mockTime.from = 'now/w';
//       mockTime.to = 'now/w';

//       initDashboardState();
//       dashboardState.syncTimefilterWithDashboardTime(mockTimefilter);

//       expect(mockTime.to).toBe(savedDashboard.timeTo);
//       expect(mockTime.from).toBe(savedDashboard.timeFrom);
//     });
//   });

//   describe('Dashboard Container Changes', () => {
//     beforeEach(() => {
//       initDashboardState();
//     });

//     test('expanedPanelId in container input casues state update', () => {
//       dashboardState.setExpandedPanelId = jest.fn();

//       const dashboardContainer = initDashboardContainer({
//         expandedPanelId: 'theCoolestPanelOnThisDashboard',
//         panels: {
//           theCoolestPanelOnThisDashboard: {
//             explicitInput: { id: 'theCoolestPanelOnThisDashboard' },
//           } as DashboardPanelState<EmbeddableInput>,
//         },
//       });

//       dashboardState.handleDashboardContainerChanges(dashboardContainer);
//       expect(dashboardState.setExpandedPanelId).toHaveBeenCalledWith(
//         'theCoolestPanelOnThisDashboard'
//       );
//     });

//     test('expanedPanelId is not updated when it is the same', () => {
//       dashboardState.setExpandedPanelId = jest
//         .fn()
//         .mockImplementation(dashboardState.setExpandedPanelId);

//       const dashboardContainer = initDashboardContainer({
//         expandedPanelId: 'theCoolestPanelOnThisDashboard',
//         panels: {
//           theCoolestPanelOnThisDashboard: {
//             explicitInput: { id: 'theCoolestPanelOnThisDashboard' },
//           } as DashboardPanelState<EmbeddableInput>,
//         },
//       });

//       dashboardState.handleDashboardContainerChanges(dashboardContainer);
//       dashboardState.handleDashboardContainerChanges(dashboardContainer);
//       expect(dashboardState.setExpandedPanelId).toHaveBeenCalledTimes(1);
//     });

//     test('expandedPanelId is set to undefined if panel does not exist in input', () => {
//       dashboardState.setExpandedPanelId = jest
//         .fn()
//         .mockImplementation(dashboardState.setExpandedPanelId);
//       const dashboardContainer = initDashboardContainer({
//         expandedPanelId: 'theCoolestPanelOnThisDashboard',
//         panels: {
//           theCoolestPanelOnThisDashboard: {
//             explicitInput: { id: 'theCoolestPanelOnThisDashboard' },
//           } as DashboardPanelState<EmbeddableInput>,
//         },
//       });

//       dashboardState.handleDashboardContainerChanges(dashboardContainer);
//       expect(dashboardState.setExpandedPanelId).toHaveBeenCalledWith(
//         'theCoolestPanelOnThisDashboard'
//       );

//       dashboardContainer.updateInput({ expandedPanelId: 'theLeastCoolPanelOnThisDashboard' });
//       dashboardState.handleDashboardContainerChanges(dashboardContainer);
//       expect(dashboardState.setExpandedPanelId).toHaveBeenCalledWith(undefined);
//     });
//   });

//   describe('isDirty', function () {
//     beforeAll(() => {
//       initDashboardState();
//     });

//     test('getIsDirty is true if isDirty is true and editing', () => {
//       dashboardState.switchViewMode(ViewMode.EDIT);
//       dashboardState.isDirty = true;
//       expect(dashboardState.getIsDirty()).toBeTruthy();
//     });

//     test('getIsDirty is false if isDirty is true and editing', () => {
//       dashboardState.switchViewMode(ViewMode.VIEW);
//       dashboardState.isDirty = true;
//       expect(dashboardState.getIsDirty()).toBeFalsy();
//     });
//   });

//   describe('initial view mode', () => {
//     test('initial view mode set to view when hideWriteControls is true', () => {
//       const initialViewModeDashboardState = new DashboardStateManager({
//         savedDashboard,
//         hideWriteControls: true,
//         allowByValueEmbeddables: false,
//         hasPendingEmbeddable: () => false,
//         kibanaVersion: '7.0.0',
//         kbnUrlStateStorage: createKbnUrlStateStorage(),
//         history: createBrowserHistory(),
//         toasts: coreMock.createStart().notifications.toasts,
//         hasTaggingCapabilities: mockHasTaggingCapabilities,
//       });
//       expect(initialViewModeDashboardState.getViewMode()).toBe(ViewMode.VIEW);
//     });

//     test('initial view mode set to edit if edit mode specified in URL', () => {
//       const kbnUrlStateStorage = createKbnUrlStateStorage();
//       kbnUrlStateStorage.set('_a', { viewMode: ViewMode.EDIT });

//       const initialViewModeDashboardState = new DashboardStateManager({
//         savedDashboard,
//         kbnUrlStateStorage,
//         kibanaVersion: '7.0.0',
//         hideWriteControls: false,
//         allowByValueEmbeddables: false,
//         history: createBrowserHistory(),
//         hasPendingEmbeddable: () => false,
//         toasts: coreMock.createStart().notifications.toasts,
//         hasTaggingCapabilities: mockHasTaggingCapabilities,
//       });
//       expect(initialViewModeDashboardState.getViewMode()).toBe(ViewMode.EDIT);
//     });

//     test('initial view mode set to edit if the dashboard is new', () => {
//       const newDashboard = getSavedDashboardMock();
//       newDashboard.id = undefined;
//       const initialViewModeDashboardState = new DashboardStateManager({
//         savedDashboard: newDashboard,
//         kibanaVersion: '7.0.0',
//         hideWriteControls: false,
//         allowByValueEmbeddables: false,
//         history: createBrowserHistory(),
//         hasPendingEmbeddable: () => false,
//         kbnUrlStateStorage: createKbnUrlStateStorage(),
//         toasts: coreMock.createStart().notifications.toasts,
//         hasTaggingCapabilities: mockHasTaggingCapabilities,
//       });
//       expect(initialViewModeDashboardState.getViewMode()).toBe(ViewMode.EDIT);
//     });

//     test('initial view mode set to edit if there is a pending embeddable', () => {
//       const newDashboard = getSavedDashboardMock();
//       newDashboard.id = undefined;
//       const initialViewModeDashboardState = new DashboardStateManager({
//         savedDashboard: newDashboard,
//         kibanaVersion: '7.0.0',
//         hideWriteControls: false,
//         allowByValueEmbeddables: false,
//         history: createBrowserHistory(),
//         hasPendingEmbeddable: () => true,
//         kbnUrlStateStorage: createKbnUrlStateStorage(),
//         toasts: coreMock.createStart().notifications.toasts,
//         hasTaggingCapabilities: mockHasTaggingCapabilities,
//       });
//       expect(initialViewModeDashboardState.getViewMode()).toBe(ViewMode.EDIT);
//     });
//   });
// });

// const savedDashboard = getSavedDashboardMock();

// // TS is *very* picky with type guards / predicates. can't just use jest.fn()
// function mockHasTaggingCapabilities(obj: any): obj is any {
//   return false;
// }

// test('container is destroyed on unmount', async () => {
//   const { createEmbeddable, destroySpy, embeddable } = setupEmbeddableFactory();

//   const dashboardStateManager = createDashboardState();
//   const { result, unmount, waitForNextUpdate } = renderHook(
//     () =>
//       useDashboardContainer({
//         getIncomingEmbeddable,
//         dashboardStateManager,
//         history,
//       }),
//     {
//       wrapper: ({ children }) => (
//         <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
//       ),
//     }
//   );

//   expect(result.current).toBeNull(); // null on initial render

//   createEmbeddable();

//   await waitForNextUpdate();

//   expect(embeddable).toBe(result.current);
//   expect(destroySpy).not.toBeCalled();

//   unmount();

//   expect(destroySpy).toBeCalled();
// });

// test('old container is destroyed on new dashboardStateManager', async () => {
//   const embeddableFactoryOld = setupEmbeddableFactory();

//   const { result, waitForNextUpdate, rerender } = renderHook<
//     DashboardStateManager,
//     DashboardContainer | null
//   >(
//     (dashboardStateManager) =>
//       useDashboardContainer({
//         getIncomingEmbeddable,
//         dashboardStateManager,
//         history,
//       }),
//     {
//       wrapper: ({ children }) => (
//         <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
//       ),
//       initialProps: createDashboardState(),
//     }
//   );

//   expect(result.current).toBeNull(); // null on initial render

//   embeddableFactoryOld.createEmbeddable();

//   await waitForNextUpdate();

//   expect(embeddableFactoryOld.embeddable).toBe(result.current);
//   expect(embeddableFactoryOld.destroySpy).not.toBeCalled();

//   const embeddableFactoryNew = setupEmbeddableFactory();
//   rerender(createDashboardState());

//   embeddableFactoryNew.createEmbeddable();

//   await waitForNextUpdate();

//   expect(embeddableFactoryNew.embeddable).toBe(result.current);

//   expect(embeddableFactoryNew.destroySpy).not.toBeCalled();
//   expect(embeddableFactoryOld.destroySpy).toBeCalled();
// });

// test('destroyed if rerendered before resolved', async () => {
//   const embeddableFactoryOld = setupEmbeddableFactory();

//   const { result, waitForNextUpdate, rerender } = renderHook<
//     DashboardStateManager,
//     DashboardContainer | null
//   >(
//     (dashboardStateManager) =>
//       useDashboardContainer({
//         getIncomingEmbeddable,
//         dashboardStateManager,
//         history,
//       }),
//     {
//       wrapper: ({ children }) => (
//         <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
//       ),
//       initialProps: createDashboardState(),
//     }
//   );

//   expect(result.current).toBeNull(); // null on initial render

//   const embeddableFactoryNew = setupEmbeddableFactory();
//   rerender(createDashboardState());
//   embeddableFactoryNew.createEmbeddable();
//   await waitForNextUpdate();
//   expect(embeddableFactoryNew.embeddable).toBe(result.current);
//   expect(embeddableFactoryNew.destroySpy).not.toBeCalled();

//   embeddableFactoryOld.createEmbeddable();

//   await act(() => Promise.resolve()); // Can't use waitFor from hooks, because there is no hook update
//   expect(embeddableFactoryNew.embeddable).toBe(result.current);
//   expect(embeddableFactoryNew.destroySpy).not.toBeCalled();
//   expect(embeddableFactoryOld.destroySpy).toBeCalled();
// });
