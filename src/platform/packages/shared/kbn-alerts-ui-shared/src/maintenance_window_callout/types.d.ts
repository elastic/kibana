import type { WeekdayStr, Options } from '@kbn/rrule';
import type { CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { Observable } from 'rxjs';
export declare enum MaintenanceWindowStatus {
    Running = "running",
    Upcoming = "upcoming",
    Finished = "finished",
    Archived = "archived"
}
export interface MaintenanceWindowModificationMetadata {
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface DateRange {
    gte: string;
    lte: string;
}
export interface MaintenanceWindowSOProperties {
    title: string;
    enabled: boolean;
    duration: number;
    expirationDate: string;
    events: DateRange[];
    rRule: RRuleParams;
    categoryIds?: string[];
}
export type MaintenanceWindowSOAttributes = MaintenanceWindowSOProperties & MaintenanceWindowModificationMetadata;
export type MaintenanceWindow = MaintenanceWindowSOAttributes & {
    status: MaintenanceWindowStatus;
    eventStartTime: string | null;
    eventEndTime: string | null;
    id: string;
};
export type RRuleParams = Partial<RRuleRecord> & Pick<RRuleRecord, 'dtstart' | 'tzid'>;
export type RRuleRecord = Omit<Options, 'dtstart' | 'byweekday' | 'wkst' | 'until'> & {
    dtstart: string;
    byweekday?: Array<WeekdayStr | string | number>;
    wkst?: WeekdayStr;
    until?: string;
};
export interface KibanaServices {
    application: {
        capabilities: Record<string, any>;
    };
    http: Pick<CoreStart['http'], 'fetch' | 'basePath'>;
    licensing?: {
        license$: Observable<ILicense>;
    };
    notifications: Pick<CoreStart['notifications'], 'toasts'>;
}
