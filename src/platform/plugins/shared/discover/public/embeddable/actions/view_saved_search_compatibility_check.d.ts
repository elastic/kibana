import type { CanAccessViewMode, EmbeddableApiContext, HasType } from '@kbn/presentation-publishing';
import type { PublishesSavedSearch } from '../types';
type ViewSavedSearchActionApi = CanAccessViewMode & HasType & PublishesSavedSearch;
export declare const compatibilityCheck: (api: EmbeddableApiContext["embeddable"]) => api is ViewSavedSearchActionApi;
export {};
