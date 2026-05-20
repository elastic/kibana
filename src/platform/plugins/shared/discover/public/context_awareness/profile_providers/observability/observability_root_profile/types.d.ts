import type { RootProfileProvider, SolutionType } from '../../..';
export interface ObservabilityRootProfileContext {
    allLogsIndexPattern: string | undefined;
    solutionType: SolutionType.Observability;
}
export type ObservabilityRootProfileProvider = RootProfileProvider<ObservabilityRootProfileContext>;
