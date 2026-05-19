import React from 'react';
import { type EbtClickAttrs } from '@kbn/ebt-click';
interface TransactionNameLinkProps {
    serviceName?: string;
    transactionName: string;
    renderContent?: (name: string) => React.ReactNode;
    ebt: Omit<EbtClickAttrs, 'action'>;
}
export declare function TransactionNameLink({ transactionName, serviceName, renderContent, ebt, }: TransactionNameLinkProps): React.JSX.Element;
export {};
