import type { Reference } from '@kbn/content-management-utils';
import type { EmbeddablePersistableStateService, EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { DashboardAttributes } from '../../schema/v1';
import type { DashboardPanelMap810 } from '../types';
export interface InjectExtractDeps {
    embeddablePersistableStateService: EmbeddablePersistableStateService;
}
/**
 * A partially parsed version of the Dashboard Attributes used for inject and extract logic for both the Dashboard Container and the Dashboard Saved Object.
 */
export type ParsedDashboardAttributesWithType = EmbeddableStateWithType & {
    panels: DashboardPanelMap810;
    type: 'dashboard';
};
export interface DashboardAttributesAndReferences {
    attributes: DashboardAttributes;
    references: Reference[];
}
export declare function injectReferences({ attributes, references }: DashboardAttributesAndReferences, deps: InjectExtractDeps): DashboardAttributes;
export declare function extractReferences({ attributes, references }: DashboardAttributesAndReferences, deps: InjectExtractDeps): DashboardAttributesAndReferences;
