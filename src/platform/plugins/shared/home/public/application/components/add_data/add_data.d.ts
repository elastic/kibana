import type { FC } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
interface Props {
    addBasePath: (path: string) => string;
    application: ApplicationStart;
    isDarkMode: boolean;
    isCloudEnabled: boolean;
}
export declare const AddData: FC<Props>;
export {};
