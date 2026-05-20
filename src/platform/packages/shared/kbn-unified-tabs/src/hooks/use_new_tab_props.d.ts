import type { TabItem } from '../types';
export declare const useNewTabProps: ({ numberOfInitialItems }: {
    numberOfInitialItems: number;
}) => {
    getNewTabDefaultProps: () => Pick<TabItem, "id" | "label">;
};
export declare function getNewTabPropsForIndex(index: number): Pick<TabItem, 'id' | 'label'>;
