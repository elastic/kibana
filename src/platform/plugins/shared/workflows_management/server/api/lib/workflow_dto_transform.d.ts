import type { WorkflowDetailDto } from '@kbn/workflows';
import type { WorkflowPartialDetailDto } from '@kbn/workflows/types/v1';
import type { WorkflowProperties } from '../../storage/workflow_storage';
/**
 * Transforms a storage document (ES _id + _source) into a public WorkflowDetailDto.
 * Throws if either id or source is undefined.
 */
export declare const transformStorageDocumentToWorkflowDto: (id: string | undefined, source: WorkflowProperties | undefined) => WorkflowDetailDto;
type PartialSource = Partial<WorkflowProperties>;
/**
 * Transforms a partial storage document (as returned by ES when `_source` is narrowed
 * to an include list) into a `WorkflowPartialDetailDto`. Only copies keys that are
 * actually present on the hit, so the consumer does not receive fabricated `undefined`
 * values for fields they did not ask for.
 *
 * Throws if `id` is undefined; tolerates an undefined `source` (returns `{ id }`).
 */
export declare const transformStoragePartialToWorkflowDto: (id: string | undefined, source: PartialSource | undefined) => WorkflowPartialDetailDto;
export {};
