import type { ReactElement } from 'react';
import React from 'react';
import type { ElasticAgentCard, NoDataCard } from '../no_data_card';
interface ActionCardsProps {
    actionCards: Array<ReactElement<typeof NoDataCard> | ReactElement<typeof ElasticAgentCard>>;
}
export declare const ActionCards: ({ actionCards }: ActionCardsProps) => React.JSX.Element;
export {};
