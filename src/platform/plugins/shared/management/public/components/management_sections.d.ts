import { ManagementSectionId } from '../types';
export declare const IngestSection: {
    id: ManagementSectionId;
    title: string;
    tip: string;
    order: number;
};
export declare const DataSection: {
    id: ManagementSectionId;
    title: string;
    tip: string;
    order: number;
};
export declare const InsightsAndAlertingSection: {
    id: ManagementSectionId;
    title: string;
    tip: string;
    order: number;
};
export declare const ClusterPerformanceSection: {
    id: ManagementSectionId;
    title: string;
    order: number;
};
export declare const MachineLearningSection: {
    id: ManagementSectionId;
    title: string;
    tip: string;
    order: number;
};
export declare const ModelManagementSection: {
    id: ManagementSectionId;
    title: string;
    tip: string;
    order: number;
};
export declare const SecuritySection: {
    id: string;
    title: string;
    tip: string;
    order: number;
};
export declare const KibanaSection: {
    id: ManagementSectionId;
    title: string;
    tip: string;
    order: number;
};
export declare const AISection: {
    id: ManagementSectionId;
    title: string;
    order: number;
};
export declare const StackSection: {
    id: ManagementSectionId;
    title: string;
    tip: string;
    order: number;
};
export declare const managementSections: ({
    id: ManagementSectionId;
    title: string;
    order: number;
} | {
    id: string;
    title: string;
    tip: string;
    order: number;
})[];
