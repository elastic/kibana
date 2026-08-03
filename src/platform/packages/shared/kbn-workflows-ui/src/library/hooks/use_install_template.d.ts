import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { type UseMutationOptions } from '@kbn/react-query';
import type { InstallTemplateResponse } from '../../api/types';
type HttpError = IHttpFetchError<ResponseErrorBody>;
/**
 * Installs a Workflow Template Library template: the server renders the
 * template with the submitted install-form values and creates a workflow
 * through the standard create path. Resolves with the new workflow's ID.
 */
export declare const useInstallTemplate: (slug: string, options?: UseMutationOptions<InstallTemplateResponse, HttpError, Record<string, unknown>>) => import("@tanstack/react-query").UseMutationResult<InstallTemplateResponse, HttpError, Record<string, unknown>, unknown>;
export {};
