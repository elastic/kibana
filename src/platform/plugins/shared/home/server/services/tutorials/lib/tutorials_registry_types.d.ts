import type { KibanaRequest, IStaticAssets } from '@kbn/core/server';
import type { TutorialSchema } from './tutorial_schema';
export { TutorialsCategory } from '../../../../common/constants';
export type { TutorialSchema, ArtifactsSchema, DashboardSchema, InstructionsSchema, StatusCheckSchema, InstructionSetSchema, InstructionVariant, Instruction, } from './tutorial_schema';
export type Platform = 'WINDOWS' | 'OSX' | 'DEB' | 'RPM';
export interface TutorialContext {
    kibanaBranch: string;
    staticAssets: IStaticAssets;
    isServerless?: boolean;
    [key: string]: unknown;
}
export type TutorialProvider = (context: TutorialContext) => TutorialSchema;
export type TutorialContextFactory = (req: KibanaRequest) => {
    [key: string]: unknown;
};
export type ScopedTutorialContextFactory = (...args: any[]) => any;
