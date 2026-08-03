import type { VisParams } from '@kbn/visualizations-common';
import type { SerializedVis } from './vis';
export declare const createVisAsync: <TVisParams extends VisParams = VisParams>(visTypeName: string, visState?: SerializedVis<TVisParams>) => Promise<import("./vis").Vis<TVisParams>>;
