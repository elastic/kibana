import type { RootProfileProvider } from '../../..';
export interface ClassicNavRootProfileContext {
    allLogsIndexPattern: string | undefined;
}
export type ClassicNavRootProfileProvider = RootProfileProvider<ClassicNavRootProfileContext>;
