import type { Reference } from '@kbn/content-management-utils';
import type { VisParams } from '@kbn/visualizations-common';
export declare const extractTimeSeriesReferences: (visType: string, visParams: VisParams, references?: Reference[], prefix?: string) => void;
export declare const injectTimeSeriesReferences: (visType: string, visParams: VisParams, references: Reference[]) => void;
