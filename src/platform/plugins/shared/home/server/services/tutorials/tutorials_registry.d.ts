import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type { TutorialProvider, ScopedTutorialContextFactory } from './lib/tutorials_registry_types';
export declare class TutorialsRegistry {
    private readonly initContext;
    private tutorialProviders;
    private readonly scopedTutorialContextFactories;
    private staticAssets;
    private readonly isServerless;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup, customIntegrations?: CustomIntegrationsPluginSetup): {
        registerTutorial: (specProvider: TutorialProvider) => void;
        unregisterTutorial: (specProvider: TutorialProvider) => void;
        addScopedTutorialContextFactory: (scopedTutorialContextFactory: ScopedTutorialContextFactory) => void;
    };
    start(core: CoreStart, customIntegrations?: CustomIntegrationsPluginSetup): {};
    private get baseTutorialContext();
}
/** @public */
export type TutorialsRegistrySetup = ReturnType<TutorialsRegistry['setup']>;
/** @public */
export type TutorialsRegistryStart = ReturnType<TutorialsRegistry['start']>;
