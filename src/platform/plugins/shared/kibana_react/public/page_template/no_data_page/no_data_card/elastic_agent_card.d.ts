import type { FunctionComponent } from 'react';
import type { NoDataPageActions } from '../no_data_page';
export type ElasticAgentCardProps = NoDataPageActions & {
    solution: string;
};
/**
 * Applies extra styling to a typical EuiAvatar
 */
export declare const ElasticAgentCard: FunctionComponent<ElasticAgentCardProps>;
