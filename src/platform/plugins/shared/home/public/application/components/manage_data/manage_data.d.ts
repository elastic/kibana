import type { FC } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import type { FeatureCatalogueEntry } from '../../../services';
interface Props {
    addBasePath: (path: string) => string;
    application: ApplicationStart;
    features: FeatureCatalogueEntry[];
}
export declare const ManageData: FC<Props>;
export {};
