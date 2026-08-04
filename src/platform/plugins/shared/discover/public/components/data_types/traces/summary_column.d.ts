import React from 'react';
import type { SummaryColumnProps } from '@kbn/discover-contextual-components';
import type { CellRenderersExtensionParams } from '../../../context_awareness';
import type { ContextAwarenessToolkit } from '../../../context_awareness';
export type SummaryColumnGetterDeps = CellRenderersExtensionParams;
export declare const getTracesSummaryColumn: (params: SummaryColumnGetterDeps, toolkit: ContextAwarenessToolkit) => (props: Omit<SummaryColumnProps, "core" | "share">) => React.JSX.Element;
