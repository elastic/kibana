import type { EuiDataGridProps } from '@elastic/eui';
import type { RenderCellValueWrapper } from './types';
export declare const wrapRenderCellValueWithInTableSearchSupport: (renderCellValue: EuiDataGridProps["renderCellValue"], highlightColor: string, highlightBackgroundColor: string) => RenderCellValueWrapper;
