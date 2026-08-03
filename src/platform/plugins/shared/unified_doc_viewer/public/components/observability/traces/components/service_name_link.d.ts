import React from 'react';
import { type EbtClickAttrs } from '@kbn/ebt-click';
interface ServiceNameLinkProps {
    serviceName: string;
    agentName?: string;
    formattedServiceName: React.ReactNode;
    'data-test-subj': string;
    ebt: Omit<EbtClickAttrs, 'action'>;
}
export declare function ServiceNameLink({ serviceName, agentName, formattedServiceName, 'data-test-subj': dataTestSubj, ebt, }: ServiceNameLinkProps): React.JSX.Element;
export {};
