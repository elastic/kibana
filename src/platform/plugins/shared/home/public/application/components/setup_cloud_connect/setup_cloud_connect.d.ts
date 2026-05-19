import type { FC } from 'react';
import type { ApplicationStart } from '@kbn/core/public';
interface Props {
    addBasePath: (path: string) => string;
    application: ApplicationStart;
}
export declare const SetupCloudConnect: FC<Props>;
export {};
