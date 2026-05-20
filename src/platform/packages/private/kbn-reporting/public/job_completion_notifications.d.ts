import type { JobId } from '@kbn/reporting-common/types';
export declare function jobCompletionNotifications(): {
    getPendingJobIds: () => JobId[];
    addPendingJobId: (jobId: JobId) => void;
    setPendingJobIds: (jobIds: JobId[]) => void;
};
