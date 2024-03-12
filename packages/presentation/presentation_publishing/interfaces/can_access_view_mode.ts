/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useStateFromPublishingSubject } from '../publishing_subject';
import { apiHasParentApi, HasParentApi } from './has_parent_api';
import { apiPublishesViewMode, PublishesViewMode } from './publishes_view_mode';

/**
 * This API can access a view mode, either its own or from its parent API.
 */
export type CanAccessViewMode =
  | Partial<PublishesViewMode>
  | Partial<HasParentApi<Partial<PublishesViewMode>>>;

/**
 * A type guard which can be used to determine if a given API has access to a view mode, its own or from its parent.
 */
export const apiCanAccessViewMode = (api: unknown): api is CanAccessViewMode => {
  return apiPublishesViewMode(api) || (apiHasParentApi(api) && apiPublishesViewMode(api.parentApi));
};

/**
 * A function which will get the view mode from the API or the parent API. if this api has a view mode AND its
 * parent has a view mode, we consider the APIs version the source of truth.
 */
export const getInheritedViewMode = (api?: CanAccessViewMode) => {
  if (apiPublishesViewMode(api)) return api.viewMode.getValue();
  if (apiHasParentApi(api) && apiPublishesViewMode(api.parentApi)) {
    return api.parentApi.viewMode.getValue();
  }
};

export const getViewModeSubject = (api?: CanAccessViewMode) => {
  if (apiPublishesViewMode(api)) return api.viewMode;
  if (apiHasParentApi(api) && apiPublishesViewMode(api.parentApi)) {
    return api.parentApi.viewMode;
  }
};

/**
 * A hook that gets a view mode from this API or its parent as a reactive variable which will cause re-renders on change.
 * if this api has a view mode AND its parent has a view mode, we consider the APIs version the source of truth.
 */
export const useInheritedViewMode = <ApiType extends CanAccessViewMode = CanAccessViewMode>(
  api: ApiType | undefined
) => {
  return useStateFromPublishingSubject(getViewModeSubject(api));
};
