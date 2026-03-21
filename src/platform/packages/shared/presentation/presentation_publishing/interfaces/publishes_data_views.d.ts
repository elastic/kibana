import type { DataView } from '@kbn/data-views-plugin/common';
import type { PublishingSubject } from '../publishing_subject';
/**
 * This API publishes a list of data views that it uses.
 */
export interface PublishesDataViews {
    dataViews$: PublishingSubject<DataView[] | undefined>;
}
export type PublishesWritableDataViews = PublishesDataViews & {
    setDataViews: (dataViews: DataView[]) => void;
};
export declare const apiPublishesDataViews: (unknownApi: null | unknown) => unknownApi is PublishesDataViews;
