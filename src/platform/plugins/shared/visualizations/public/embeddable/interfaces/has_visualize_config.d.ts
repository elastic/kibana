import type { HasType } from '@kbn/presentation-publishing';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import type { VisParams } from '../../types';
import type Vis from '../../vis';
export type HasVisualizeConfig = HasType<typeof VISUALIZE_EMBEDDABLE_TYPE> & {
    getVis: () => Vis<VisParams>;
    getExpressionVariables?: () => Record<string, unknown> | undefined;
};
export declare const apiHasVisualizeConfig: (api: unknown) => api is HasVisualizeConfig;
