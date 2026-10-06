import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * Parameters for the `useRemove` React hook.
 */
export type Params = Pick<SampleDataSet, 'id' | 'defaultIndex' | 'name'> & {
    /** Handler to invoke when the Sample Data Set is successfully removed. */
    onRemove: (id: string) => void;
};
/**
 * A React hook that allows a component to remove a sample data set, handling success and
 * failure in the Kibana UI. It also provides a boolean that indicates if the data set is
 * in the process of being removed.
 *
 * After removal, this hook polls the status endpoint until the data is confirmed
 * as uninstalled
 */
export declare const useRemove: ({ id, defaultIndex, name, onRemove }: Params) => [() => void, boolean];
