import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { type ESQLControlVariable } from '@kbn/esql-types';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { BehaviorSubject, type Subject } from 'rxjs';
import type { initializeSettingsManager } from './settings_manager';
export declare const initializeESQLVariablesManager: (children$: PublishingSubject<{
    [key: string]: DefaultEmbeddableApi;
}>, settingsManager: ReturnType<typeof initializeSettingsManager>, forcePublish$: Subject<void>) => {
    api: {
        publishedEsqlVariables$: BehaviorSubject<ESQLControlVariable[]>;
        unpublishedEsqlVariables$: BehaviorSubject<ESQLControlVariable[]>;
        publishVariables: () => void;
    };
    cleanup: () => void;
};
