import React from 'react';
import type { CardsNavigationComponentProps, AppId, AppDefinition } from './types';
type AggregatedCardNavDefinitions = NonNullable<CardsNavigationComponentProps['extendedCardNavigationDefinitions']> | Record<AppId, AppDefinition>;
export declare const getAppIdsByCategory: (category: string, appDefinitions: AggregatedCardNavDefinitions) => ("api_keys" | "application_connections" | "content_connectors" | "dataViews" | "data_quality" | "data_usage" | "filesManagement" | "index_management" | "ingest_pipelines" | "jobsListLink" | "maintenanceWindows" | "objects" | "pipelines" | "reporting" | "roles" | "settings" | "spaces" | "tags" | "transform" | "triggersActions" | "triggersActionsConnectors")[];
export declare const CardsNavigation: ({ sections, appBasePath, onCardClick, hideLinksTo, extendedCardNavigationDefinitions, }: CardsNavigationComponentProps) => React.JSX.Element;
export {};
