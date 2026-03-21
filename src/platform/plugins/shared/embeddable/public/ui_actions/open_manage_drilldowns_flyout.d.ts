import type { PresentationContainer } from '@kbn/presentation-publishing';
import { type CanAccessViewMode, type EmbeddableApiContext, type HasUniqueId, type HasParentApi, type HasSupportedTriggers } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { HasDrilldowns } from '../drilldowns/types';
export type ManageDrilldownActionApi = CanAccessViewMode & HasDrilldowns & HasParentApi<Partial<PresentationContainer>> & HasSupportedTriggers & Partial<HasUniqueId>;
export declare const openManageDrilldownsFlyout: ActionDefinition<EmbeddableApiContext>;
