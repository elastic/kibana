import type { ControlGroupRendererApi, HasEditorConfig } from './types';
export declare const apiHasEditorConfig: (parentApi: unknown) => parentApi is HasEditorConfig;
export declare const isControlGroupRendererApi: (api: unknown) => api is ControlGroupRendererApi;
