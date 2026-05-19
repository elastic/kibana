import React from 'react';
import type { CardsNavigationComponentProps, AppId, AppDefinition } from './types';
type AggregatedCardNavDefinitions = NonNullable<CardsNavigationComponentProps['extendedCardNavigationDefinitions']> | Record<AppId, AppDefinition>;
export declare const getAppIdsByCategory: (category: string, appDefinitions: AggregatedCardNavDefinitions) => ("dataViews" | "spaces" | "tags" | "transform" | "roles" | "settings" | "api_keys" | "data_quality" | "data_usage" | "content_connectors" | "filesManagement" | "index_management" | "ingest_pipelines" | "jobsListLink" | "maintenanceWindows" | "objects" | "pipelines" | "reporting" | "triggersActionsConnectors" | "triggersActions")[];
export declare const CardsNavigation: ({ sections, appBasePath, onCardClick, hideLinksTo, extendedCardNavigationDefinitions, }: CardsNavigationComponentProps) => React.JSX.Element;
export {};
