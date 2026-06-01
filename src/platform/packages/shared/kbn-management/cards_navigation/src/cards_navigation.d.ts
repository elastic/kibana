import React from 'react';
import type { CardsNavigationComponentProps, AppId, AppDefinition } from './types';
type AggregatedCardNavDefinitions = NonNullable<CardsNavigationComponentProps['extendedCardNavigationDefinitions']> | Record<AppId, AppDefinition>;
export declare const getAppIdsByCategory: (category: string, appDefinitions: AggregatedCardNavDefinitions) => ("spaces" | "settings" | "dataViews" | "transform" | "objects" | "tags" | "ingest_pipelines" | "pipelines" | "index_management" | "jobsListLink" | "filesManagement" | "reporting" | "triggersActionsConnectors" | "triggersActions" | "maintenanceWindows" | "roles" | "api_keys" | "application_connections" | "data_quality" | "data_usage" | "content_connectors")[];
export declare const CardsNavigation: ({ sections, appBasePath, onCardClick, hideLinksTo, extendedCardNavigationDefinitions, }: CardsNavigationComponentProps) => React.JSX.Element;
export {};
