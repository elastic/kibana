import type { ScopedHistory } from '@kbn/core-application-browser';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { History } from 'history';
import type { DashboardCreationOptions } from '../..';
import type { DashboardEmbedSettings } from '../types';
type IncomingEmbeddables = EmbeddablePackageState[] | undefined;
interface UseCreationOptionsProps {
    history: History;
    getScopedHistory: () => ScopedHistory;
    kbnUrlStateStorage: IKbnUrlStateStorage;
    embedSettings?: DashboardEmbedSettings;
    incomingEmbeddables: IncomingEmbeddables;
    validateOutcome: DashboardCreationOptions['validateLoadedSavedObject'];
}
export declare const useCreationOptions: ({ history, getScopedHistory, kbnUrlStateStorage, embedSettings, incomingEmbeddables, validateOutcome, }: UseCreationOptionsProps) => () => Promise<DashboardCreationOptions>;
export {};
