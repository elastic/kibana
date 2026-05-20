import type { DatatableVisualizationState } from '@kbn/lens-common';
import type { DatatableConfig } from '../../../../schema';
import type { ColumnIdMapping } from './columns';
export declare function convertStylingToAPIFormat(visualization: DatatableVisualizationState, columnIdMapping: ColumnIdMapping): Pick<DatatableConfig, 'styling'>;
