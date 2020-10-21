import { PluginInitializerContext } from '../../../src/core/server';
import { VersionBranchingExamplesPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new VersionBranchingExamplesPlugin(initializerContext);
}

export { VersionBranchingExamplesPluginSetup, VersionBranchingExamplesPluginStart } from './types';
