import type { ShareContext, ExportShare } from '@kbn/share-plugin/public';
import type { ExportModalShareOpts } from '../../share_context_menu';
/**
 * @description Returns config for the PDF export integration
 */
export declare const getShareMenuItems: ({ apiClient, startServices$ }: ExportModalShareOpts) => ({ objectType, objectId, isDirty, onClose, shareableUrl, shareableUrlForSavedObject, ...shareOpts }: ShareContext) => ReturnType<ExportShare["config"]> extends Promise<infer R> ? R : never;
