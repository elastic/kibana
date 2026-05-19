import type { PluginInitializerContext } from '@kbn/core/public';
export type { FeatureCatalogueSetup, EnvironmentSetup, TutorialSetup, HomePublicPluginSetup, HomePublicPluginStart, } from './plugin';
export type { AddDataTab, FeatureCatalogueCategory, FeatureCatalogueEntry, FeatureCatalogueRegistry, FeatureCatalogueSolution, Environment, TutorialVariables, TutorialDirectoryHeaderLinkComponent, TutorialModuleNoticeComponent, WelcomeRenderTelemetryNotice, WelcomeServiceSetup, } from './services';
export type { CustomComponentProps } from './services/tutorials/tutorial_service';
export { INSTRUCTION_VARIANT, getDisplayText } from '../common/instruction_variant';
import { HomePublicPlugin } from './plugin';
export declare const plugin: (initializerContext: PluginInitializerContext) => HomePublicPlugin;
