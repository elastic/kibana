import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * A React hook that fetches a list of Sample Data Sets from Kibana, as well as failure
 * indicators in the Kibana UI.  It also provides a boolean that indicates if the list is
 * currently being fetched, as well as a method to refresh the list on demand.
 */
export declare const useList: () => [SampleDataSet[], () => Promise<void>, boolean];
