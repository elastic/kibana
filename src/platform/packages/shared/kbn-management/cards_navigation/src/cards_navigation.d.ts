import React from 'react';
import type { CardsNavigationComponentProps, AppId, AppDefinition } from './types';
type AggregatedCardNavDefinitions = NonNullable<CardsNavigationComponentProps['extendedCardNavigationDefinitions']> | Record<AppId, AppDefinition>;
export declare const getAppIdsByCategory: (category: string, appDefinitions: AggregatedCardNavDefinitions) => ("spaces" | "settings" | "tags" | "transform" | "roles" | "objects" | "dataViews" | "ingest_pipelines" | "pipelines" | "index_management" | "jobsListLink" | "filesManagement" | "reporting" | "triggersActionsConnectors" | "triggersActions" | "maintenanceWindows" | "api_keys" | "data_quality" | "data_usage" | "content_connectors")[];
export declare const CardsNavigation: ({ sections, appBasePath, onCardClick, hideLinksTo, extendedCardNavigationDefinitions, }: CardsNavigationComponentProps) => React.JSX.Element;
export {};
