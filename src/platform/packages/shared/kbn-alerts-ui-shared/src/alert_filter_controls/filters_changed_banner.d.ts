import type { FC } from 'react';
interface FiltersChangesBanner {
    saveChangesHandler: () => void;
    discardChangesHandler: () => void;
}
export declare const FiltersChangedBanner: FC<FiltersChangesBanner>;
export {};
