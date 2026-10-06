export { CoreInjectionService } from './src/service';
export { createSetupModule, createStartModule, InternalCoreSetup, InternalCoreStart, InternalPluginInitializer, type InternalPluginInitializerContext, type ServiceIdentifierFactory, } from './src/modules/lifecycle';
export { Global } from './src/modules/plugin';
export type { InternalCoreDiServiceSetup, InternalCoreDiServiceStart } from './src/contracts';
export { cacheInScope } from './src/utils';
