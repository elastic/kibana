import { type FC } from 'react';
import { type CoreStart } from '@kbn/core/public';
interface Props {
    kibanaVersion: string;
    coreStart: CoreStart;
}
export declare const SolutionEmptyPrompt: FC<Props>;
export {};
