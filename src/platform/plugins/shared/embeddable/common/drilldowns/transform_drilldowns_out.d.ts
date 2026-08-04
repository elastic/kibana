import type { Reference } from '@kbn/content-management-utils';
import type { SerializedDrilldowns, DrilldownState } from '../../server';
export declare function getTransformDrilldownsOut(getTranformOut: (type: string) => ((state: DrilldownState, references?: Reference[]) => DrilldownState) | undefined): <StoredState extends SerializedDrilldowns>(storedState: StoredState, references?: Reference[]) => StoredState;
