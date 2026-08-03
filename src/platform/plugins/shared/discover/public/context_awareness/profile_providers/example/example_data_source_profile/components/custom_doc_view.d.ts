import React from 'react';
import type { OpenInNewTabParams, UpdateESQLQueryFn } from '../../../../types';
export declare const CustomDocView: React.FC<{
    openInNewTab?: (params: OpenInNewTabParams) => Promise<void>;
    updateESQLQuery?: UpdateESQLQueryFn;
    formattedRecord: string;
}>;
