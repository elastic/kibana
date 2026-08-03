import React from 'react';
import type { QueryOperator } from '@kbn/esql-composer';
import { type EbtClickAttrs } from '@kbn/ebt-click';
export declare const DiscoverEsqlLink: ({ indexPattern, whereClause, tabLabel, dataTestSubj, ebt, children, }: {
    indexPattern?: string;
    whereClause?: QueryOperator;
    tabLabel: string;
    dataTestSubj: string;
    ebt: EbtClickAttrs;
    children: React.ReactNode;
}) => React.JSX.Element;
