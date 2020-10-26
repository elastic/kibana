import {
  AppMountParameters,
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../src/core/public';
import {
  VersionBranchingExamplesPluginSetup,
  VersionBranchingExamplesPluginStart,
  AppPluginStartDependencies,
  AppPluginSetupDependencies,
} from './types';

export class VersionBranchingExamplesPlugin
  implements Plugin<VersionBranchingExamplesPluginSetup, VersionBranchingExamplesPluginStart> {
  public setup(
    core: CoreSetup,
    deps: AppPluginSetupDependencies
  ): VersionBranchingExamplesPluginSetup {
    const { developerExamples } = deps;

    core.application.register({
      id: 'version_branching_examples',
      title: 'version branching examples',
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    developerExamples.register({
      appId: 'version_branching_examples',
      title: 'version branching examples',
      description: 'example branching based on the version',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/blob/master/src/plugins/bfetch/README.md',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });

    // Return methods that should be available to other plugins
    return {};
  }

  public start(
    core: CoreStart,
    deps: AppPluginStartDependencies
  ): VersionBranchingExamplesPluginStart {
    return {};
  }

  public stop() {}
}
