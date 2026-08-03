import type { CanAddNewPanel } from '@kbn/presentation-publishing';
import type { PublishesESQLVariables } from '@kbn/esql-types';
export declare const addControlsFromSavedSession: (container: CanAddNewPanel & Partial<PublishesESQLVariables>, controlGroupJson: string, uuid?: string | undefined) => Promise<void>;
