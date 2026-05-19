import type { Reference } from '@kbn/content-management-utils';
import type { VisParams } from '@kbn/visualizations-common';
export declare const extractControlsReferences: (visType: string, visParams: VisParams, references?: Reference[], prefix?: string) => void;
export declare const injectControlsReferences: (visType: string, visParams: VisParams, references: Reference[]) => void;
