import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';
import { DeveloperExamplesSetup } from '../../developer_examples/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VersionBranchingExamplesPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VersionBranchingExamplesPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface AppPluginSetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}
