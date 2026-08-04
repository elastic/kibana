import type { DrilldownDefinition } from '../types';
import type { DrilldownState } from '../../../server/drilldowns/types';
/**
 * Template for a pre-configured new drilldown, this gives ability to create a
 * drilldown from a template instead of user creating a drilldown from scratch.
 * This is used in "drilldown cloning" functionality, where drilldowns can be
 * cloned from one dashboard panel to another.
 */
export interface DrilldownTemplate {
    /**
     * A string that uniquely identifies this item in a list of `DrilldownTemplate[]`.
     */
    id: string;
    /**
     * A user facing text that provides information about the source of this template.
     */
    description: string;
    /**
     * Preliminary configuration of the new drilldown, to be used in the dynamicaction factory.
     */
    drilldownState: DrilldownState;
}
export type DrilldownFactory = Pick<DrilldownDefinition, 'displayName' | 'euiIcon' | 'supportedTriggers'> & DrilldownDefinition['setup'] & {
    order: number;
    type: string;
    isLicenseCompatible: boolean;
};
