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

// const initializeStateSyncing = useCallback(
//     ({ savedDashboard }: { savedDashboard: DashboardSavedObject }) => {
//       const filterManager = data.query.filterManager;
//       const timefilter = data.query.timefilter.timefilter;
//       const queryStringManager = data.query.queryString;

//       const dashboardStateManager = new DashboardStateManager({
//         savedDashboard,
//         hideWriteControls: dashboardConfig.getHideWriteControls(),
//         kibanaVersion: initializerContext.env.packageInfo.version,
//         kbnUrlStateStorage,
//         history,
//         usageCollection,
//       });

//       // sync initial app filters from state to filterManager
//       // if there is an existing similar global filter, then leave it as global
//       filterManager.setAppFilters(_.cloneDeep(dashboardStateManager.appState.filters));
//       queryStringManager.setQuery(migrateLegacyQuery(dashboardStateManager.appState.query));

//       // setup syncing of app filters between appState and filterManager
//       const stopSyncingAppFilters = connectToQueryState(
//         data.query,
//         {
//           set: ({ filters, query }) => {
//             dashboardStateManager.setFilters(filters || []);
//             dashboardStateManager.setQuery(query || queryStringManager.getDefaultQuery());
//           },
//           get: () => ({
//             filters: dashboardStateManager.appState.filters,
//             query: dashboardStateManager.getQuery(),
//           }),
//           state$: dashboardStateManager.appState$.pipe(
//             map((appState) => ({
//               filters: appState.filters,
//               query: queryStringManager.formatQuery(appState.query),
//             }))
//           ),
//         },
//         {
//           filters: esFilters.FilterStateStore.APP_STATE,
//           query: true,
//         }
//       );

//       // The hash check is so we only update the time filter on dashboard open, not during
//       // normal cross app navigation.
//       if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
//         const initialGlobalStateInUrl = kbnUrlStateStorage.get<QueryState>('_g');
//         if (!initialGlobalStateInUrl?.time) {
//           dashboardStateManager.syncTimefilterWithDashboardTime(timefilter);
//         }
//         if (!initialGlobalStateInUrl?.refreshInterval) {
//           dashboardStateManager.syncTimefilterWithDashboardRefreshInterval(timefilter);
//         }
//       }

//       // starts syncing `_g` portion of url with query services
//       // it is important to start this syncing after `dashboardStateManager.syncTimefilterWithDashboard(timefilter);` above is run,
//       // otherwise it will case redundant browser history records
//       const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
//         data.query,
//         kbnUrlStateStorage
//       );

//       // starts syncing `_a` portion of url
//       dashboardStateManager.startStateSyncing();

//       return {
//         dashboardStateManager,
//         stopSyncingQueryServiceStateWithUrl,
//         stopSyncingAppFilters,
//       };
//     },
//     [
//       kbnUrlStateStorage,
//       dashboardConfig,
//       history,
//       usageCollection,
//       initializerContext.env,
//       data.query,
//     ]
//   );

//   // Dashboard loading useEffect
//   useEffect(() => {
//     console.log('dashboard load useEffect');
//     // if (state.savedDashboard?.id === savedDashboardId && state.initialized) {
//     //   console.log('dashboard load early return');
//     //   return;
//     // }

//     data.indexPatterns
//       .ensureDefaultIndexPattern()
//       ?.then(() => savedDashboards.get(savedDashboardId) as Promise<DashboardSavedObject>)
//       .then((savedDashboard) => {
//         // if you've loaded an existing dashboard, add it to the recently accessed
//         if (savedDashboardId) {
//           chrome.recentlyAccessed.add(
//             savedDashboard.getFullPath(),
//             savedDashboard.title,
//             savedDashboardId
//           );
//         }
//         const {
//           dashboardStateManager,
//           stopSyncingQueryServiceStateWithUrl,
//           stopSyncingAppFilters,
//         } = initializeStateSyncing({ savedDashboard });
//         chrome.setBreadcrumbs([
//           {
//             text: i18n.translate('dashboard.dashboardAppBreadcrumbsTitle', {
//               defaultMessage: 'Dashboard',
//             }),
//             onClick: () => {
//               redirectToDashboard({ listingFilter: '' });
//             },
//           },
//           {
//             text: getDashboardTitle(
//               dashboardStateManager.getTitle(),
//               dashboardStateManager.getViewMode(),
//               dashboardStateManager.getIsDirty(data.query.timefilter.timefilter),
//               dashboardStateManager.isNew()
//             ),
//           },
//         ]);
//         const dashboardFactory = embeddable.getEmbeddableFactory<
//           DashboardContainerInput,
//           ContainerOutput,
//           DashboardContainer
//         >(DASHBOARD_CONTAINER_TYPE);
//         if (!dashboardFactory) {
//           throw new EmbeddableFactoryNotFoundError(
//             'dashboard app requires dashboard embeddable factory'
//           );
//         }
//         const subscriptions = new Subscription();
//         // const searchSessionId = data.search.session.start();
//         dashboardFactory
//           .create(
//             getDashboardContainerInput({
//               dashboardStateManager,
//               query: data.query,
//               searchSessionId: data.search.session.start(),
//             })
//           )
//           .then((dashboardContainer: DashboardContainer | ErrorEmbeddable | undefined) => {
//             if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
//               return;
//             }
//             subscriptions.add(
//               getInputSubscription({
//                 dashboardContainer,
//                 dashboardStateManager,
//                 filterManager: data.query.filterManager,
//               })
//             );
//             subscriptions.add(
//               getOutputSubscription({
//                 dashboardContainer,
//                 indexPatterns,
//                 onUpdateIndexPatterns: (newIndexPatterns) => {
//                   setState((s) => {
//                     return {
//                       ...s,
//                       indexPatterns: newIndexPatterns,
//                     };
//                   });
//                 },
//               })
//             );
//             subscriptions.add(
//               getFiltersSubscription({
//                 query: data.query,
//                 dashboardContainer,
//                 dashboardStateManager,
//               })
//             );
//             dashboardStateManager.registerChangeListener(() => {
//               console.log('INSIDE THIS CHANGE LISTENER AND STATE IS', state);
//               // we aren't checking dirty state because there are changes the container needs to know about
//               // that won't make the dashboard "dirty" - like a view mode change.
//               refreshDashboardContainer();
//             });
//             setState(() => ({
//               dashboardContainer,
//               dashboardStateManager,
//               savedDashboard,
//               initialized: true,
//             }));
//             // dashboardContainer.render(document.getElementById('dashboardViewport')!);
//           });
//         return () => {
//           console.log('cleanup HELLOO');
//           dashboardStateManager.destroy();
//           state.dashboardContainer?.destroy();
//           subscriptions.unsubscribe();
//           stopSyncingQueryServiceStateWithUrl();
//           stopSyncingAppFilters();
//           data.search.session.clear();
//         };
//       })
//       .catch((error) => {
//         // Preserve BWC of v5.3.0 links for new, unsaved dashboards.
//         // See https://github.com/elastic/kibana/issues/10951 for more context.
//         if (error instanceof SavedObjectNotFound && savedDashboardId === 'create') {
//           // Note preserve querystring part is necessary so the state is preserved through the redirect.
//           // I am not sure that I need to do this anymore
//           history.replace({
//             ...history.location, // preserve query,
//             pathname: DashboardConstants.CREATE_NEW_DASHBOARD_URL,
//           });
//           core.notifications.toasts.addWarning(
//             i18n.translate('dashboard.urlWasRemovedInSixZeroWarningMessage', {
//               defaultMessage:
//                 'The url "dashboard/create" was removed in 6.0. Please update your bookmarks.',
//             })
//           );
//           return new Promise(() => {});
//         } else {
//           // E.g. a corrupt or deleted dashboard
//           core.notifications.toasts.addDanger(error.message);
//           history.push(DashboardConstants.LANDING_PAGE_PATH);
//           return new Promise(() => {});
//         }
//       });
//     /* eslint-disable-next-line react-hooks/exhaustive-deps */
//   }, [
//     savedDashboardId,
//     // redirectToDashboard,
//     // chrome,
//     // data.search.session,
//     // embeddable,
//     // data.query,
//     // history,
//     // savedDashboards,
//     // data.indexPatterns,
//     // chrome.recentlyAccessed,
//     // indexPatterns,
//     // core.notifications.toasts,
//     // initializeStateSyncing,
//     // data.query.filterManager,

//     // state.savedDashboard?.id,
//     // state.initialized,
//     // state.dashboardContainer?.destroy,
//     // refreshDashboardContainer,
//   ]);
