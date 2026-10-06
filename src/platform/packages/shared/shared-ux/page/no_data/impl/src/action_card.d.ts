import React from 'react';
import type { NoDataCardProps } from '@kbn/shared-ux-card-no-data';
import type { ActionCardProps } from '@kbn/shared-ux-page-no-data-types';
export type NoDataPageActions = NoDataCardProps;
export declare const KEY_ELASTIC_AGENT = "elasticAgent";
export declare const ActionCard: ({ action }: ActionCardProps) => React.JSX.Element | null;
