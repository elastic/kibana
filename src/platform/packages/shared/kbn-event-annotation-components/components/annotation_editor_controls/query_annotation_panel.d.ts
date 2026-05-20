import type { Query } from '@kbn/data-plugin/common';
import React from 'react';
import { type QueryInputServices } from '@kbn/visualization-ui-components';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-common';
export declare const defaultQuery: Query;
export declare const ConfigPanelQueryAnnotation: ({ annotation, dataView, onChange, queryInputShouldOpen, queryInputServices, appName, }: {
    annotation?: QueryPointEventAnnotationConfig;
    onChange: (annotations: Partial<QueryPointEventAnnotationConfig> | undefined) => void;
    dataView: DataView;
    queryInputShouldOpen?: boolean;
    queryInputServices: QueryInputServices;
    appName: string;
}) => React.JSX.Element;
