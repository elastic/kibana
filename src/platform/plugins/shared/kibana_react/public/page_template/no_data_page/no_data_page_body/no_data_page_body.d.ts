import type { ReactElement } from 'react';
import React from 'react';
import type { NoDataPageProps } from '../no_data_page';
import type { ElasticAgentCard, NoDataCard } from '../no_data_card';
type NoDataPageBodyProps = {
    actionCards: Array<ReactElement<typeof NoDataCard> | ReactElement<typeof ElasticAgentCard>>;
} & Omit<NoDataPageProps, 'actions'>;
export declare const NoDataPageBody: (props: NoDataPageBodyProps) => React.JSX.Element;
export {};
