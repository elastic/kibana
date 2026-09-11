import type { TimeSlice } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { type PublishingSubject } from '@kbn/presentation-publishing';
import type { BehaviorSubject} from 'rxjs';
import { type Subject } from 'rxjs';
import type { initializeSettingsManager } from './settings_manager';
export declare const initializeTimesliceManager: (children$: PublishingSubject<{
    [key: string]: DefaultEmbeddableApi;
}>, settingsManager: ReturnType<typeof initializeSettingsManager>, forcePublish$: Subject<void>) => {
    api: {
        timeslice$: BehaviorSubject<TimeSlice | undefined>;
        publishedTimeslice$: BehaviorSubject<TimeSlice | undefined>;
        unpublishedTimeslice$: BehaviorSubject<TimeSlice | undefined>;
        publishTimeslice: () => void;
    };
    cleanup: () => void;
};
