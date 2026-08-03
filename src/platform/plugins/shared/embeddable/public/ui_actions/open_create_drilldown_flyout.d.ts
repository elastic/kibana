import type { PresentationContainer } from '@kbn/presentation-publishing';
import { type CanAccessViewMode, type EmbeddableApiContext, type HasUniqueId, type HasParentApi, type HasSupportedTriggers, type HasType } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { DrilldownRegistryEntry, HasDrilldowns } from '../drilldowns/types';
export type CreateDrilldownActionApi = CanAccessViewMode & Required<HasDrilldowns> & HasParentApi<HasType & Partial<PresentationContainer>> & HasSupportedTriggers & Partial<HasUniqueId>;
export declare const openCreateDrilldownFlyout: ActionDefinition<EmbeddableApiContext>;
export declare function getAllDrilldownTriggers(entries: DrilldownRegistryEntry[], context: object): Promise<string[]>;
