import React, { Component } from 'react';
import type { IBasePath } from '@kbn/core/public';
import { type EuiTablePersistInjectedProps } from '@kbn/shared-ux-table-persist';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import type { v1 } from '../../../../common';
import type { SavedObjectWithMetadata, SavedObjectRelation, SavedObjectInvalidRelation } from '../../../types';
export interface RelationshipsProps {
    basePath: IBasePath;
    getRelationships: (type: string, id: string) => Promise<v1.RelationshipsResponseHTTP>;
    savedObject: SavedObjectWithMetadata;
    close: () => void;
    goInspectObject: (obj: SavedObjectWithMetadata) => void;
    canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
    allowedTypes: SavedObjectManagementTypeInfo[];
    showPlainSpinner?: boolean;
}
export interface RelationshipsState {
    relations: SavedObjectRelation[];
    invalidRelations: SavedObjectInvalidRelation[];
    isLoading: boolean;
    error?: string;
}
export declare class RelationshipsClass extends Component<RelationshipsProps & EuiTablePersistInjectedProps<SavedObjectRelation>, RelationshipsState> {
    render(): React.JSX.Element;
    constructor(props: RelationshipsProps & EuiTablePersistInjectedProps<SavedObjectRelation>);
    UNSAFE_componentWillMount(): void;
    UNSAFE_componentWillReceiveProps(nextProps: RelationshipsProps): void;
    getRelationshipData(): Promise<void>;
    renderError(): React.JSX.Element | null;
    renderInvalidRelationship(): React.JSX.Element | null;
    renderRelationshipsTable(): React.JSX.Element | null;
}
export declare const Relationships: React.FC<import("@kbn/shared-ux-table-persist").HOCProps<v1.SavedObjectRelation, Omit<RelationshipsProps & EuiTablePersistInjectedProps<v1.SavedObjectRelation>, "euiTablePersist">>>;
